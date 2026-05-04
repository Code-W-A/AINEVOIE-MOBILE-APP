import { describe, expect, it, jest } from '@jest/globals';
import {
  resolveCoveragePlaceSelectionService,
  searchCoveragePlaceSuggestionsService,
} from '../../src/providerCoverageSearch';

describe('provider coverage search services', () => {
  it('returns Romania-only autocomplete suggestions for the selected county and city', async () => {
    const fetchImpl = jest.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'OK',
        predictions: [
          {
            place_id: 'place_1',
            description: 'Bulevardul Iuliu Maniu 10, București, România',
            structured_formatting: {
              main_text: 'Bulevardul Iuliu Maniu 10',
              secondary_text: 'București, România',
            },
          },
        ],
      }),
    } as never);

    const result = await searchCoveragePlaceSuggestionsService(
      {
        mapsApiKey: 'demo-key',
        fetchImpl,
      },
      {
        query: 'Iuliu',
        countyCode: 'B',
        cityCode: 'sector-6',
      },
    );

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(String(fetchImpl.mock.calls[0][0])).toContain('components=country%3Aro');
    expect(result.suggestions).toEqual([
      expect.objectContaining({
        placeId: 'place_1',
        primaryText: 'Bulevardul Iuliu Maniu 10',
      }),
    ]);
  });

  it('resolves a selected place into the private provider coverage payload', async () => {
    const fetchImpl = jest.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'OK',
        results: [
          {
            formatted_address: 'Bulevardul Iuliu Maniu 10, București, România',
            geometry: {
              location: {
                lat: 44.4321,
                lng: 26.0456,
              },
            },
            address_components: [
              { long_name: 'România', short_name: 'RO', types: ['country', 'political'] },
              { long_name: 'București', short_name: 'B', types: ['administrative_area_level_1', 'political'] },
              { long_name: 'Sector 6', short_name: 'Sector 6', types: ['sublocality_level_1', 'sublocality', 'political'] },
              { long_name: 'București', short_name: 'București', types: ['locality', 'political'] },
            ],
          },
        ],
      }),
    } as never);

    const result = await resolveCoveragePlaceSelectionService(
      {
        mapsApiKey: 'demo-key',
        fetchImpl,
      },
      {
        placeId: 'place_1',
        countyCode: 'B',
        cityCode: 'sector-6',
      },
    );

    expect(result.coverageArea).toEqual(expect.objectContaining({
      countryCode: 'RO',
      countyCode: 'B',
      cityCode: 'sector-6',
      cityName: 'Sector 6',
      placeId: 'place_1',
      locationLabel: 'Bulevardul Iuliu Maniu 10',
      formattedAddress: 'Bulevardul Iuliu Maniu 10, București, România',
      centerLat: 44.4321,
      centerLng: 26.0456,
    }));
    expect(result.coverageAreaText).toBe('România, București, Sector 6');
  });

  it('rejects places resolved outside the selected county and city', async () => {
    const fetchImpl = jest.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'OK',
        results: [
          {
            formatted_address: 'Strada Memorandumului 10, Cluj-Napoca, România',
            geometry: {
              location: {
                lat: 46.77,
                lng: 23.58,
              },
            },
            address_components: [
              { long_name: 'România', short_name: 'RO', types: ['country', 'political'] },
              { long_name: 'Cluj', short_name: 'CJ', types: ['administrative_area_level_1', 'political'] },
              { long_name: 'Cluj-Napoca', short_name: 'Cluj-Napoca', types: ['locality', 'political'] },
            ],
          },
        ],
      }),
    } as never);

    await expect(
      resolveCoveragePlaceSelectionService(
        {
          mapsApiKey: 'demo-key',
          fetchImpl,
        },
        {
          placeId: 'place_2',
          countyCode: 'B',
          cityCode: 'sector-6',
        },
      ),
    ).rejects.toThrow('does not match the chosen county and city');
  });
});
