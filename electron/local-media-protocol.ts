import { pathToFileURL } from 'node:url'
import type { LocalAssetType } from '../src/shared/local-assets'
import { isOpaqueAssetId } from '../src/shared/local-assets'
import type { ResolvedLocalAsset } from './local-asset-registry'

type LocalMediaProtocolDependencies = {
  getAllowedType: (assetId: string) => LocalAssetType | null
  resolve: (
    assetId: string,
    type: LocalAssetType
  ) => Promise<ResolvedLocalAsset | null>
  fetchFile: (url: string, init?: RequestInit) => Promise<Response>
}

/** Extracts a validated opaque asset ID from a custom-protocol URL. */
export const decodeLocalAssetId = (requestUrl: string): string | null => {
  try {
    const url = new URL(requestUrl)
    const assetId = decodeURIComponent(url.pathname.slice(1))

    return url.host === 'asset' &&
      url.pathname.startsWith('/') &&
      !assetId.includes('/') &&
      isOpaqueAssetId(assetId)
      ? assetId
      : null
  } catch {
    return null
  }
}

/** Creates a plain text protocol error response. */
const errorResponse = (
  status: number,
  message: string,
  headers: HeadersInit = {}
): Response =>
  new Response(message, {
    status,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      ...headers
    }
  })

/** Builds response headers that prevent media-type sniffing. */
const mediaHeaders = (asset: ResolvedLocalAsset): Headers => {
  const headers = new Headers({
    'accept-ranges': 'bytes',
    'content-length': String(asset.size),
    'content-type': asset.mimeType,
    'x-content-type-options': 'nosniff'
  })

  return headers
}

/**
 * Creates the custom-protocol handler for currently authorized local assets.
 */
export const createLocalMediaProtocolHandler = ({
  getAllowedType,
  resolve,
  fetchFile
}: LocalMediaProtocolDependencies) => {
  return async (request: Request): Promise<Response> => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return errorResponse(405, 'Method not allowed.', {
        allow: 'GET, HEAD'
      })
    }

    const assetId = decodeLocalAssetId(request.url)
    const allowedType = assetId ? getAllowedType(assetId) : null
    if (!assetId || !allowedType) {
      return errorResponse(404, 'Local asset not found.')
    }

    let asset: ResolvedLocalAsset | null
    try {
      asset = await resolve(assetId, allowedType)
    } catch {
      asset = null
    }
    if (!asset) {
      return errorResponse(404, 'Local asset not found.')
    }

    const headers = mediaHeaders(asset)
    if (request.method === 'HEAD') {
      return new Response(null, {
        status: 200,
        headers
      })
    }

    const range = request.headers.get('range')
    let fileResponse: Response
    try {
      fileResponse = await fetchFile(
        pathToFileURL(asset.realPath).toString(),
        range
          ? {
              headers: {
                range
              }
            }
          : undefined
      )
    } catch {
      return errorResponse(404, 'Local asset not found.')
    }
    const responseHeaders = new Headers(fileResponse.headers)
    responseHeaders.set('content-type', asset.mimeType)
    responseHeaders.set('x-content-type-options', 'nosniff')
    responseHeaders.set('accept-ranges', 'bytes')
    if (!responseHeaders.has('content-length') && !range) {
      responseHeaders.set('content-length', String(asset.size))
    }

    return new Response(fileResponse.body, {
      status: fileResponse.status,
      statusText: fileResponse.statusText,
      headers: responseHeaders
    })
  }
}
