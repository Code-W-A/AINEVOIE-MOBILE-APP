"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRomaniaCountry = getRomaniaCountry;
exports.getRomaniaCounties = getRomaniaCounties;
exports.getRomaniaCitiesByCounty = getRomaniaCitiesByCounty;
exports.findRomaniaCounty = findRomaniaCounty;
exports.findRomaniaCity = findRomaniaCity;
exports.resolveRomaniaCoverageHierarchy = resolveRomaniaCoverageHierarchy;
exports.deriveRomaniaHierarchyFromPlacemark = deriveRomaniaHierarchyFromPlacemark;
exports.buildRomaniaCoverageAreaText = buildRomaniaCoverageAreaText;
exports.isRomaniaCoverageHierarchyComplete = isRomaniaCoverageHierarchyComplete;
exports.normalizeRomaniaLocationLabel = normalizeRomaniaLocationLabel;
const ROMANIA_COUNTRY = Object.freeze({
    countryCode: 'RO',
    countryName: 'Romania',
    countryNameLocal: 'România',
});
const COUNTY_DEFINITIONS = Object.freeze([
    { countyCode: 'AB', countyName: 'Alba', cities: ['Alba Iulia', 'Aiud', 'Blaj', 'Sebes', 'Cugir'] },
    { countyCode: 'AR', countyName: 'Arad', cities: ['Arad', 'Lipova', 'Ineu', 'Curtici', 'Pecica'] },
    { countyCode: 'AG', countyName: 'Arges', cities: ['Pitesti', 'Campulung', 'Curtea de Arges', 'Mioveni', 'Costesti'] },
    { countyCode: 'BC', countyName: 'Bacau', cities: ['Bacau', 'Onesti', 'Moinesti', 'Comanesti', 'Buhusi'] },
    { countyCode: 'BH', countyName: 'Bihor', cities: ['Oradea', 'Salonta', 'Marghita', 'Beius', 'Alesd'] },
    { countyCode: 'BN', countyName: 'Bistrita-Nasaud', aliases: ['Bistrita Nasaud'], cities: ['Bistrita', 'Nasaud', 'Beclean', 'Sangeorz-Bai'] },
    { countyCode: 'BT', countyName: 'Botosani', cities: ['Botosani', 'Dorohoi', 'Darabani', 'Saveni', 'Flamanzi'] },
    { countyCode: 'BR', countyName: 'Braila', cities: ['Braila', 'Ianca', 'Faurei', 'Insuratei'] },
    { countyCode: 'BV', countyName: 'Brasov', cities: ['Brasov', 'Fagaras', 'Sacele', 'Rasnov', 'Codlea'] },
    { countyCode: 'BZ', countyName: 'Buzau', cities: ['Buzau', 'Ramnicu Sarat', 'Nehoiu', 'Pogoanele'] },
    { countyCode: 'CS', countyName: 'Caras-Severin', aliases: ['Caras Severin'], cities: ['Resita', 'Caransebes', 'Oravita', 'Moldova Noua', 'Bocsa'] },
    { countyCode: 'CL', countyName: 'Calarasi', cities: ['Calarasi', 'Oltenita', 'Lehliu Gara', 'Fundulea'] },
    { countyCode: 'CJ', countyName: 'Cluj', cities: ['Cluj-Napoca', 'Turda', 'Dej', 'Gherla', 'Campia Turzii', 'Huedin'] },
    { countyCode: 'CT', countyName: 'Constanta', cities: ['Constanta', 'Mangalia', 'Medgidia', 'Navodari', 'Cernavoda'] },
    { countyCode: 'CV', countyName: 'Covasna', cities: ['Sfantu Gheorghe', 'Targu Secuiesc', 'Covasna', 'Intorsura Buzaului'] },
    { countyCode: 'DB', countyName: 'Dambovita', cities: ['Targoviste', 'Moreni', 'Pucioasa', 'Gaesti', 'Fieni'] },
    { countyCode: 'DJ', countyName: 'Dolj', cities: ['Craiova', 'Bailesti', 'Calafat', 'Filiasi', 'Segarcea'] },
    { countyCode: 'GL', countyName: 'Galati', cities: ['Galati', 'Tecuci', 'Targu Bujor', 'Beresti'] },
    { countyCode: 'GR', countyName: 'Giurgiu', cities: ['Giurgiu', 'Bolintin Vale', 'Mihailesti'] },
    { countyCode: 'GJ', countyName: 'Gorj', cities: ['Targu Jiu', 'Motru', 'Rovinari', 'Targu Carbunesti', 'Novaci'] },
    { countyCode: 'HR', countyName: 'Harghita', cities: ['Miercurea Ciuc', 'Odorheiu Secuiesc', 'Gheorgheni', 'Toplita', 'Cristuru Secuiesc'] },
    { countyCode: 'HD', countyName: 'Hunedoara', cities: ['Deva', 'Hunedoara', 'Petrosani', 'Orastie', 'Lupeni', 'Vulcan'] },
    { countyCode: 'IL', countyName: 'Ialomita', cities: ['Slobozia', 'Urziceni', 'Fetesti', 'Tandarei', 'Amara'] },
    { countyCode: 'IS', countyName: 'Iasi', aliases: ['Iasi'], cities: ['Iasi', 'Pascani', 'Harlau', 'Targu Frumos', 'Podu Iloaiei'] },
    { countyCode: 'IF', countyName: 'Ilfov', cities: ['Voluntari', 'Buftea', 'Pantelimon', 'Otopeni', 'Popesti-Leordeni', 'Magurele'] },
    { countyCode: 'MM', countyName: 'Maramures', aliases: ['Maramures'], cities: ['Baia Mare', 'Sighetu Marmatiei', 'Borsa', 'Viseu de Sus', 'Targu Lapus'] },
    { countyCode: 'MH', countyName: 'Mehedinti', aliases: ['Mehedinti'], cities: ['Drobeta-Turnu Severin', 'Orsova', 'Strehaia', 'Vanzu Mare'] },
    { countyCode: 'MS', countyName: 'Mures', aliases: ['Mures'], cities: ['Targu Mures', 'Sighisoara', 'Reghin', 'Tarnaveni', 'Ludus'] },
    { countyCode: 'NT', countyName: 'Neamt', aliases: ['Neamt'], cities: ['Piatra Neamt', 'Roman', 'Targu Neamt', 'Bicaz', 'Roznov'] },
    { countyCode: 'OT', countyName: 'Olt', cities: ['Slatina', 'Caracal', 'Bals', 'Corabia', 'Draganesti-Olt'] },
    { countyCode: 'PH', countyName: 'Prahova', cities: ['Ploiesti', 'Campina', 'Baicoi', 'Breaza', 'Valenii de Munte', 'Sinaia'] },
    { countyCode: 'SM', countyName: 'Satu Mare', cities: ['Satu Mare', 'Carei', 'Negresti-Oas', 'Tasnad', 'Livada'] },
    { countyCode: 'SJ', countyName: 'Salaj', aliases: ['Salaj'], cities: ['Zalau', 'Simleu Silvaniei', 'Jibou', 'Cehu Silvaniei'] },
    { countyCode: 'SB', countyName: 'Sibiu', cities: ['Sibiu', 'Medias', 'Cisnadie', 'Avrig', 'Agnita'] },
    { countyCode: 'SV', countyName: 'Suceava', cities: ['Suceava', 'Falticeni', 'Radauti', 'Campulung Moldovenesc', 'Vatra Dornei'] },
    { countyCode: 'TR', countyName: 'Teleorman', cities: ['Alexandria', 'Rosiori de Vede', 'Turnu Magurele', 'Zimnicea', 'Videle'] },
    { countyCode: 'TM', countyName: 'Timis', aliases: ['Timis'], cities: ['Timisoara', 'Lugoj', 'Sannicolau Mare', 'Jimbolia', 'Deta'] },
    { countyCode: 'TL', countyName: 'Tulcea', cities: ['Tulcea', 'Macin', 'Babadag', 'Isaccea', 'Sulina'] },
    { countyCode: 'VS', countyName: 'Vaslui', cities: ['Vaslui', 'Barlad', 'Husi', 'Negresti'] },
    { countyCode: 'VL', countyName: 'Valcea', aliases: ['Valcea'], cities: ['Ramnicu Valcea', 'Dragasani', 'Calimanesti', 'Babeni', 'Horezu'] },
    { countyCode: 'VN', countyName: 'Vrancea', cities: ['Focsani', 'Adjud', 'Marasesti', 'Odobesti', 'Panciu'] },
    { countyCode: 'B', countyName: 'Bucuresti', aliases: ['Bucuresti', 'Municipiul Bucuresti'], cities: ['Bucuresti'] },
]);
function withDiacriticsFallback(value) {
    const normalized = sanitizeText(value);
    if (!normalized) {
        return normalized;
    }
    if (normalized === 'Romania')
        return 'România';
    if (normalized === 'Bucuresti')
        return 'București';
    if (normalized === 'Timis')
        return 'Timiș';
    if (normalized === 'Maramures')
        return 'Maramureș';
    if (normalized === 'Mehedinti')
        return 'Mehedinți';
    if (normalized === 'Mures')
        return 'Mureș';
    if (normalized === 'Neamt')
        return 'Neamț';
    if (normalized === 'Salaj')
        return 'Sălaj';
    if (normalized === 'Valcea')
        return 'Vâlcea';
    if (normalized === 'Iasi')
        return 'Iași';
    if (normalized === 'Bistrita-Nasaud')
        return 'Bistrița-Năsăud';
    if (normalized === 'Caras-Severin')
        return 'Caraș-Severin';
    if (normalized === 'Calarasi')
        return 'Călărași';
    if (normalized === 'Dambovita')
        return 'Dâmbovița';
    if (normalized === 'Timisoara')
        return 'Timișoara';
    if (normalized === 'Pitesti')
        return 'Pitești';
    if (normalized === 'Campulung')
        return 'Câmpulung';
    if (normalized === 'Curtea de Arges')
        return 'Curtea de Argeș';
    if (normalized === 'Botosani')
        return 'Botoșani';
    if (normalized === 'Brasov')
        return 'Brașov';
    if (normalized === 'Buzau')
        return 'Buzău';
    if (normalized === 'Resita')
        return 'Reșița';
    if (normalized === 'Constanta')
        return 'Constanța';
    if (normalized === 'Sfantu Gheorghe')
        return 'Sfântu Gheorghe';
    if (normalized === 'Targoviste')
        return 'Târgoviște';
    if (normalized === 'Galati')
        return 'Galați';
    if (normalized === 'Targu Jiu')
        return 'Târgu Jiu';
    if (normalized === 'Targu Mures')
        return 'Târgu Mureș';
    if (normalized === 'Piatra Neamt')
        return 'Piatra Neamț';
    if (normalized === 'Valenii de Munte')
        return 'Vălenii de Munte';
    if (normalized === 'Zalau')
        return 'Zalău';
    if (normalized === 'Campulung Moldovenesc')
        return 'Câmpulung Moldovenesc';
    if (normalized === 'Ramnicu Valcea')
        return 'Râmnicu Vâlcea';
    if (normalized === 'Focsani')
        return 'Focșani';
    if (normalized === 'Baicoi')
        return 'Băicoi';
    if (normalized === 'Sannicolau Mare')
        return 'Sânnicolau Mare';
    if (normalized === 'Targu Neamt')
        return 'Târgu Neamț';
    if (normalized === 'Targu Frumos')
        return 'Târgu Frumos';
    if (normalized === 'Targu Bujor')
        return 'Târgu Bujor';
    if (normalized === 'Simleu Silvaniei')
        return 'Șimleu Silvaniei';
    if (normalized === 'Sangeorz-Bai')
        return 'Sângeorz-Băi';
    if (normalized === 'Negresti-Oas')
        return 'Negrești-Oaș';
    if (normalized === 'Moldova Noua')
        return 'Moldova Nouă';
    if (normalized === 'Dragasani')
        return 'Drăgășani';
    if (normalized === 'Calimanesti')
        return 'Călimănești';
    if (normalized === 'Babeni')
        return 'Băbeni';
    return normalized;
}
function sanitizeText(value) {
    return String(value || '').trim();
}
function normalizeToken(value) {
    return sanitizeText(value)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9 -]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}
function slugifyCity(value) {
    return normalizeToken(value).replace(/ /g, '-');
}
function buildCityRecord(cityName) {
    const displayName = withDiacriticsFallback(cityName);
    return {
        cityCode: slugifyCity(displayName),
        cityName: displayName,
        aliases: [sanitizeText(cityName), displayName].filter(Boolean),
    };
}
function buildCountyRecord(county) {
    const displayName = withDiacriticsFallback(county.countyName);
    return {
        countyCode: county.countyCode,
        countyName: displayName,
        aliases: Array.from(new Set([
            sanitizeText(county.countyName),
            displayName,
            ...(Array.isArray(county.aliases) ? county.aliases : []),
        ].filter(Boolean))),
        cities: county.cities.map((city) => buildCityRecord(city)),
    };
}
const ROMANIA_COUNTIES = Object.freeze(COUNTY_DEFINITIONS.map((county) => Object.freeze(buildCountyRecord(county))));
function getCountyCandidates(county) {
    return [
        county.countyCode,
        county.countyName,
        ...(Array.isArray(county.aliases) ? county.aliases : []),
    ];
}
function getCityCandidates(city) {
    return [
        city.cityCode,
        city.cityName,
        ...(Array.isArray(city.aliases) ? city.aliases : []),
    ];
}
function matchByCandidates(candidates, value) {
    const normalizedValue = normalizeToken(value);
    if (!normalizedValue) {
        return false;
    }
    return candidates.some((candidate) => normalizeToken(candidate) === normalizedValue);
}
function matchIncludesCandidates(candidates, value) {
    const normalizedValue = normalizeToken(value);
    if (!normalizedValue) {
        return false;
    }
    return candidates.some((candidate) => normalizedValue.includes(normalizeToken(candidate)));
}
function uniqueStrings(values) {
    return Array.from(new Set(values.map((value) => sanitizeText(value)).filter(Boolean)));
}
function getRomaniaCountry() {
    return { ...ROMANIA_COUNTRY };
}
function getRomaniaCounties() {
    return ROMANIA_COUNTIES.map((county) => ({
        countyCode: county.countyCode,
        countyName: county.countyName,
    }));
}
function getRomaniaCitiesByCounty(countyCode) {
    const county = findRomaniaCounty(countyCode);
    if (!county) {
        return [];
    }
    return county.cities.map((city) => ({
        cityCode: city.cityCode,
        cityName: city.cityName,
    }));
}
function findRomaniaCounty(value) {
    const normalizedValue = normalizeToken(value);
    if (!normalizedValue) {
        return null;
    }
    const exactMatch = ROMANIA_COUNTIES.find((county) => matchByCandidates(getCountyCandidates(county), normalizedValue));
    if (exactMatch) {
        return exactMatch;
    }
    return ROMANIA_COUNTIES.find((county) => matchIncludesCandidates(getCountyCandidates(county), normalizedValue)) || null;
}
function findRomaniaCity(countyCode, value) {
    const county = findRomaniaCounty(countyCode);
    const normalizedValue = normalizeToken(value);
    if (!county || !normalizedValue) {
        return null;
    }
    const exactMatch = county.cities.find((city) => matchByCandidates(getCityCandidates(city), normalizedValue));
    if (exactMatch) {
        return exactMatch;
    }
    return county.cities.find((city) => matchIncludesCandidates(getCityCandidates(city), normalizedValue)) || null;
}
function resolveRomaniaCoverageHierarchy(input = {}) {
    const countryValue = uniqueStrings([
        input.countryCode,
        input.countryName,
        input.country,
    ]);
    const countyValue = uniqueStrings([
        input.countyCode,
        input.countyName,
        input.region,
        input.subregion,
        input.adminArea,
    ]);
    const cityValue = uniqueStrings([
        input.cityCode,
        input.cityName,
        input.city,
        input.locality,
        input.district,
        input.name,
    ]);
    const isRomania = countryValue.length === 0
        || countryValue.some((value) => ['ro', 'romania'].includes(normalizeToken(value)));
    const county = countyValue.map((value) => findRomaniaCounty(value)).find(Boolean) || null;
    const city = county
        ? cityValue.map((value) => findRomaniaCity(county.countyCode, value)).find(Boolean) || null
        : null;
    return {
        countryCode: isRomania ? ROMANIA_COUNTRY.countryCode : '',
        countryName: isRomania ? ROMANIA_COUNTRY.countryNameLocal : '',
        countyCode: county?.countyCode || '',
        countyName: county?.countyName || '',
        cityCode: city?.cityCode || '',
        cityName: city?.cityName || '',
    };
}
function deriveRomaniaHierarchyFromPlacemark(input = {}) {
    const formattedAddress = sanitizeText(input.formattedAddress);
    const hierarchy = resolveRomaniaCoverageHierarchy({
        countryCode: input.countryCode,
        countryName: input.country || input.countryName,
        countyCode: input.countyCode,
        countyName: input.region || input.countyName || input.subregion,
        cityCode: input.cityCode,
        cityName: input.city || input.cityName || input.district || input.locality,
        district: input.district,
        name: input.name,
    });
    if (hierarchy.countyCode && hierarchy.cityCode) {
        return hierarchy;
    }
    if (!formattedAddress) {
        return hierarchy;
    }
    const addressParts = formattedAddress.split(',').map((part) => part.trim()).filter(Boolean);
    const fallbackCounty = hierarchy.countyCode
        ? findRomaniaCounty(hierarchy.countyCode)
        : addressParts.map((part) => findRomaniaCounty(part)).find(Boolean) || null;
    const fallbackCity = fallbackCounty
        ? (hierarchy.cityCode
            ? findRomaniaCity(fallbackCounty.countyCode, hierarchy.cityCode)
            : addressParts.map((part) => findRomaniaCity(fallbackCounty.countyCode, part)).find(Boolean)) || null
        : null;
    return {
        countryCode: fallbackCounty || fallbackCity || hierarchy.countryCode ? ROMANIA_COUNTRY.countryCode : '',
        countryName: fallbackCounty || fallbackCity || hierarchy.countryCode ? ROMANIA_COUNTRY.countryNameLocal : '',
        countyCode: fallbackCounty?.countyCode || hierarchy.countyCode,
        countyName: fallbackCounty?.countyName || hierarchy.countyName,
        cityCode: fallbackCity?.cityCode || hierarchy.cityCode,
        cityName: fallbackCity?.cityName || hierarchy.cityName,
    };
}
function buildRomaniaCoverageAreaText(input = {}) {
    const resolved = resolveRomaniaCoverageHierarchy(input);
    const parts = [
        resolved.countryName,
        resolved.countyName,
        resolved.cityName,
    ].filter(Boolean);
    return parts.join(', ');
}
function isRomaniaCoverageHierarchyComplete(input = {}) {
    const resolved = resolveRomaniaCoverageHierarchy(input);
    return Boolean(resolved.countryCode === ROMANIA_COUNTRY.countryCode
        && resolved.countyCode
        && resolved.cityCode);
}
function normalizeRomaniaLocationLabel(value) {
    return sanitizeText(value);
}
