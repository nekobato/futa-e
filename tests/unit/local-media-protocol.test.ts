import { describe, expect, it, vi } from 'vitest'
import { createLocalMediaProtocolHandler } from '../../electron/local-media-protocol'
import type { ResolvedLocalAsset } from '../../electron/local-asset-registry'

const ASSET_ID = '11111111-1111-4111-8111-111111111111'
const ASSET_URL = `futae-media://asset/${ASSET_ID}`
const ASSET: ResolvedLocalAsset = {
  id: ASSET_ID,
  path: '/Volumes/Media/clip.mp4',
  realPath: '/Volumes/Media/clip.mp4',
  type: 'video',
  name: 'clip.mp4',
  mimeType: 'video/mp4',
  size: 1024
}

/** Creates a protocol handler with observable registry and fetch doubles. */
const createHandler = () => {
  const resolve = vi.fn(async () => ASSET)
  const fetchFile = vi.fn(
    async () =>
      new Response('video', {
        status: 206,
        headers: {
          'content-range': 'bytes 0-4/1024'
        }
      })
  )
  const handler = createLocalMediaProtocolHandler({
    getAllowedType: (assetId) => (assetId === ASSET_ID ? 'video' : null),
    resolve,
    fetchFile
  })

  return { fetchFile, handler, resolve }
}

describe('local media protocol', () => {
  it('rejects methods other than GET and HEAD', async () => {
    const { handler, resolve } = createHandler()

    const response = await handler(
      new Request(ASSET_URL, {
        method: 'POST'
      })
    )

    expect(response.status).toBe(405)
    expect(response.headers.get('allow')).toBe('GET, HEAD')
    expect(resolve).not.toHaveBeenCalled()
  })

  it('returns not found for IDs outside the playback allowlist', async () => {
    const { handler, resolve } = createHandler()

    const response = await handler(
      new Request('futae-media://asset/22222222-2222-4222-8222-222222222222')
    )

    expect(response.status).toBe(404)
    expect(resolve).not.toHaveBeenCalled()
  })

  it('does not decode an absolute path as an asset ID', async () => {
    const { handler, resolve } = createHandler()

    const response = await handler(
      new Request(
        'futae-media://asset/%2FUsers%2Fdemo%2FDocuments%2Fsecret.txt'
      )
    )

    expect(response.status).toBe(404)
    expect(resolve).not.toHaveBeenCalled()
  })

  it('serves HEAD metadata without reading the file body', async () => {
    const { fetchFile, handler } = createHandler()

    const response = await handler(
      new Request(ASSET_URL, {
        method: 'HEAD'
      })
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('video/mp4')
    expect(response.headers.get('content-length')).toBe('1024')
    expect(response.headers.get('x-content-type-options')).toBe('nosniff')
    expect(fetchFile).not.toHaveBeenCalled()
  })

  it('forwards only the video Range header to the file fetch', async () => {
    const { fetchFile, handler } = createHandler()

    const response = await handler(
      new Request(ASSET_URL, {
        headers: {
          authorization: 'do-not-forward',
          range: 'bytes=0-4'
        }
      })
    )

    expect(response.status).toBe(206)
    expect(response.headers.get('content-range')).toBe('bytes 0-4/1024')
    expect(fetchFile).toHaveBeenCalledWith('file:///Volumes/Media/clip.mp4', {
      headers: {
        range: 'bytes=0-4'
      }
    })
  })
})
