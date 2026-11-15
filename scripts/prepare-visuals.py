"""Build compact, credited Earth and map assets. Run from the project root."""
import argparse
import io
import json
import math
import struct
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
WESTERN_STATES = {
    "04": "AZ", "06": "CA", "08": "CO", "16": "ID", "30": "MT",
    "32": "NV", "35": "NM", "41": "OR", "49": "UT", "53": "WA",
    "56": "WY", "48": "TX", "40": "OK", "20": "KS", "31": "NE",
}


def build_map(archive):
    """Read the simple polygon parts and corresponding FIPS DBF attribute."""
    with zipfile.ZipFile(archive) as source:
        shapefile = source.read(next(n for n in source.namelist() if n.endswith(".shp")))
        table = source.read(next(n for n in source.namelist() if n.endswith(".dbf")))
    count, header, length = struct.unpack_from("<IHH", table, 4)
    field_offset = 1
    fips_offset = None
    for field in range(32, header - 1, 32):
        name = table[field:field + 11].split(b"\0")[0]
        if name == b"STATEFP":
            fips_offset = field_offset
        field_offset += table[field + 16]
    if fips_offset is None:
        raise ValueError("Boundary dataset requires a STATEFP column")

    offset, paths = 100, {}
    for row in range(count):
        _, length_words = struct.unpack_from(">II", shapefile, offset)
        offset += 8
        shape = memoryview(shapefile)[offset:offset + length_words * 2]
        offset += length_words * 2
        fips = table[header + row * length + fips_offset:][:2].decode()
        if fips not in WESTERN_STATES:
            continue
        kind, parts, points = struct.unpack_from("<i32xii", shape)
        if kind != 5:
            raise ValueError(f"Expected polygon for state {fips}")
        intervals = (*struct.unpack_from(f"<{parts}i", shape, 44), points)
        vertices = tuple(struct.iter_unpack("<dd", shape[44 + parts * 4:]))
        rings = []
        for low, high in zip(intervals, intervals[1:]):
            rings.append(" ".join(
                f"{'M' if index == 0 else 'L'}{(lon + 126.5) * 18:.1f},{(48.8 - lat) * 22:.1f}"
                for index, (lon, lat) in enumerate(vertices[low:high])
            ) + "Z")
        paths[WESTERN_STATES[fips]] = "".join(rings)
    if not {"AZ", "CA"} <= paths.keys():
        raise ValueError("Arizona and California are required")
    target = ROOT / "app" / "state-paths.mjs"
    target.write_text(
        "// 2024 U.S. Census cartographic boundaries, 1:20m. See docs/VISUAL_REFERENCE_MAP.md.\n"
        f"export const statePaths = {json.dumps(paths, indent=2)};\n",
        encoding="utf-8",
    )


def build_earth(glb):
    import numpy as np
    from PIL import Image, ImageOps

    with glb.open("rb") as source:
        magic, version, _ = struct.unpack("<4sII", source.read(12))
        size, chunk_type = struct.unpack("<II", source.read(8))
        if magic != b"glTF" or version != 2 or chunk_type != 0x4E4F534A:
            raise ValueError("Expected a glTF 2 binary with a JSON chunk")
        meta = json.loads(source.read(size))
        source.read(8)
        view = meta["bufferViews"][meta["images"][0]["bufferView"]]
        source.seek(view.get("byteOffset", 0), 1)
        image = Image.open(io.BytesIO(source.read(view["byteLength"]))).convert("RGB")
    # The supplied UV texture is stored south-up. Reorient north-up.
    image = ImageOps.flip(image)
    image.thumbnail((2048, 1024), Image.Resampling.LANCZOS)
    image.save(ASSETS / "earth-texture.webp", quality=83, method=6)

    size = 960
    axis = (np.arange(size, dtype=np.float64) + .5 - size / 2) / (size / 2 - 2)
    x, y = np.meshgrid(axis, -axis)
    radius_squared = x * x + y * y
    z = np.sqrt(np.maximum(0, 1 - radius_squared))
    tilt = math.radians(32)
    lat = np.arcsin(np.clip(y * math.cos(tilt) + z * math.sin(tilt), -1, 1))
    lon = math.radians(-100) + np.arctan2(x, z * math.cos(tilt) - y * math.sin(tilt))
    color = np.asarray(image)
    u = ((lon / (2 * math.pi) + .5) % 1) * (image.width - 1)
    v = (.5 - lat / math.pi) * (image.height - 1)
    u0, v0 = u.astype(int), v.astype(int)
    fu, fv = (u - u0)[..., None], (v - v0)[..., None]
    u1, v1 = (u0 + 1) % image.width, np.minimum(v0 + 1, image.height - 1)
    rgb = ((color[v0, u0] * (1 - fu) + color[v0, u1] * fu) * (1 - fv)
           + (color[v1, u0] * (1 - fu) + color[v1, u1] * fu) * fv)
    light = np.clip(-.50 * x + .41 * y + .57 * z, 0, 1)
    rim = np.power(1 - z, 4)
    rgb = rgb * (.31 + .91 * light[..., None]) + np.array([9, 25, 29])
    rgb += rim[..., None] * (.19 + .55 * light[..., None]) * np.array([39, 162, 184])
    alpha = np.clip((1 - np.sqrt(radius_squared)) * (size / 2) + .5, 0, 1) * 255
    rgba = np.concatenate((np.clip(rgb, 0, 255), alpha[..., None]), axis=2).astype(np.uint8)
    Image.fromarray(rgba).save(ASSETS / "earth-poster.webp", quality=88, method=6)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--earth", type=Path)
    parser.add_argument("--boundaries", type=Path)
    args = parser.parse_args()
    if args.earth:
        build_earth(args.earth)
    if args.boundaries:
        build_map(args.boundaries)
    if not args.earth and not args.boundaries:
        parser.error("pass at least one asset source")
