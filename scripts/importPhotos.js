console.log("Import script starting...");

import fs from "fs";
import exifr from "exifr";
import sizeOf from "image-size";
import fetch from "node-fetch";

const photoFolder = "./assets/photos";
const outputFile = "./data/photos.json";

// Cache to avoid repeated geocode calls
const locationCache = {};

// Reverse geocode using OpenStreetMap Nominatim
async function getLocationData(lat, lon) {

  if (!lat || !lon) {
    return {
      city: null,
      town: null,
      village: null,
      hamlet: null,
      state: null,
      country: null
    };
  }

  const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;

  if (locationCache[key]) {
    return locationCache[key];
  }

  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=en`;

  try {

    const res = await fetch(url, {
      headers: { "User-Agent": "film-sca-photo-import" }
    });

    const data = await res.json();
    const address = data.address || {};

    const locationData = {
      city: address.city || null,
      town: address.town || null,
      village: address.village || null,
      hamlet: address.hamlet || null,
      state: address.state || null,
      country: address.country || null,
      countryCode: address.country_code ? address.country_code.toUpperCase() : null
    };

    locationCache[key] = locationData;

    // Respect Nominatim rate limit
    await new Promise(r => setTimeout(r, 1100));

    return locationData;

  } catch (err) {

    console.log("Geocode failed:", lat, lon);

    return {
      city: null,
      town: null,
      village: null,
      hamlet: null,
      state: null,
      country: null
    };

  }
}

async function run() {

  if (!fs.existsSync(photoFolder)) {
    console.log("Photo folder not found:", photoFolder);
    return;
  }

  // Only load valid image files
  const files = fs.readdirSync(photoFolder).filter(file =>
    /\.(jpg|jpeg|png)$/i.test(file)
  );

  console.log(`Found ${files.length} images`);

  const photos = [];

  for (const file of files) {

    const path = `${photoFolder}/${file}`;

    try {

      // Extract EXIF metadata
      const exif = await exifr.parse(path).catch(() => ({}));

      const lat = exif?.latitude || null;
      const lon = exif?.longitude || null;

      // Get image dimensions
      const buffer = fs.readFileSync(path);
      const dimensions = sizeOf(buffer);

      const width = dimensions?.width || 1;
      const height = dimensions?.height || 1;
      const aspect = width / height;

      // Reverse geocode location
      const location = await getLocationData(lat, lon);

      // Build readable location string for console
      const locationString = [
        location.city,
        location.town,
        location.village,
        location.hamlet,
        location.state,
        location.country
      ].filter(Boolean).join(", ");

      const photoData = {
        filename: file,
        width,
        height,
        aspect,
        date: exif?.DateTimeOriginal || null,
        lat,
        lon,

        city: location.city,
        town: location.town,
        village: location.village,
        hamlet: location.hamlet,
        state: location.state,
        country: location.country,
        countryCode: location.countryCode,

        lifePeriod: null,
        notes: ""
      };

      photos.push(photoData);

      console.log(
        `Processed: ${file} | ${width}x${height} | ${locationString || "Unknown Location"}`
      );

    } catch (err) {

      console.log("Failed:", file, err.message);

    }

  }

  // Ensure data folder exists
  if (!fs.existsSync("./data")) {
    fs.mkdirSync("./data");
  }

  // Write JSON file
  fs.writeFileSync(outputFile, JSON.stringify(photos, null, 2));

  console.log(`photos.json created with ${photos.length} entries`);

}

run();