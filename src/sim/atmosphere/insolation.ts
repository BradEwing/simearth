const DEG_TO_RAD = Math.PI / 180;

/**
 * Annual-mean insolation at a latitude, relative to the planetary average
 * (2nd-Legendre-polynomial approximation). ≈ 1.24 at the equator, ≈ 0.52 at the
 * poles. Multiplying the global mean insolation by this gives the local value.
 */
export function insolationFactor(latitudeDeg: number): number {
  const s = Math.sin(latitudeDeg * DEG_TO_RAD);
  const p2 = (3 * s * s - 1) / 2;
  return 1 - 0.482 * p2;
}

/**
 * Spherical area weight of a latitude band (∝ cos φ). The grid is a cylinder for
 * topology, but climate weights tiles by their true spherical area so global
 * means are physical (poles contribute little) and the thermostat stays clean.
 */
export function areaWeight(latitudeDeg: number): number {
  return Math.cos(latitudeDeg * DEG_TO_RAD);
}
