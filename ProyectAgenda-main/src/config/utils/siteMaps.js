function hasValue(value) {
    return value !== undefined && value !== null && value !== "";
}

function normalizeOptionalCoordinate(body, fieldName) {
    if (!Object.prototype.hasOwnProperty.call(body, fieldName)) {
        return;
    }

    const value = body[fieldName];
    if (value === null) {
        return;
    }

    if (typeof value === "string") {
        const trimmed = value.trim();
        if (trimmed === "") {
            body[fieldName] = null;
            return;
        }

        const parsedValue = Number(trimmed);
        if (!Number.isNaN(parsedValue)) {
            body[fieldName] = parsedValue;
        }
    }
}

function normalizeSiteMapFields(body) {
    normalizeOptionalCoordinate(body, "latitude");
    normalizeOptionalCoordinate(body, "longitude");
}

function buildSiteMapsUrl(site) {
    if (!site) {
        return null;
    }

    const latitude = typeof site.latitude === "number" ? site.latitude : null;
    const longitude = typeof site.longitude === "number" ? site.longitude : null;

    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${latitude},${longitude}`)}`;
    }

    const direction = site.direction || site.address || null;
    const ubication = site.ubication || site.city || null;
    const name = site.name || null;
    const query = [direction, ubication, name]
        .filter((item) => hasValue(item))
        .join(", ");

    if (!query) {
        return null;
    }

    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function enrichSiteWithMapData(site) {
    if (!site) {
        return null;
    }

    return {
        ...site,
        mapsUrl: buildSiteMapsUrl(site),
    };
}

module.exports = {
    normalizeSiteMapFields,
    buildSiteMapsUrl,
    enrichSiteWithMapData,
};
