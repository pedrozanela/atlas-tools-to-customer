import { describe, expect, it } from 'vitest'
import { PEOPLE_API_BASE, PEOPLE_BASE_URL, isSameOriginUrl, peoplePath } from './basePath'

describe('People public path contract', () => {
  it('keeps the SPA and API below /people', () => {
    expect(PEOPLE_BASE_URL).toBe('/people/')
    expect(PEOPLE_API_BASE).toBe('/people/api')
    expect(peoplePath('sw.js')).toBe('/people/sw.js')
    expect(peoplePath('/signup')).toBe('/people/signup')
    expect(peoplePath('t/acme')).toBe('/people/t/acme')
    expect(peoplePath('programa/editar?slug=acme')).toBe('/people/programa/editar?slug=acme')
    expect(peoplePath('rutas/editar?slug=acme')).toBe('/people/rutas/editar?slug=acme')
  })

  it('detects same-origin API targets', () => {
    expect(isSameOriginUrl('/people/api', 'https://atlas.example')).toBe(true)
    expect(isSameOriginUrl('https://api.example/api', 'https://atlas.example')).toBe(false)
  })
})
