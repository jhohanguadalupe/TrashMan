// Funciones compartidas por todos los shaders de Trash Man (ruido procedural).
#ifndef TRASHMAN_COMMON
#define TRASHMAN_COMMON

float tm_hash21(float2 p)
{
    p = frac(p * float2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return frac(p.x * p.y);
}
float2 tm_hash22(float2 p)
{
    float n = tm_hash21(p);
    return float2(n, tm_hash21(p + n + 19.19));
}
float tm_vnoise(float2 p)
{
    float2 i = floor(p), f = frac(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = tm_hash21(i), b = tm_hash21(i + float2(1, 0));
    float c = tm_hash21(i + float2(0, 1)), d = tm_hash21(i + float2(1, 1));
    return lerp(lerp(a, b, f.x), lerp(c, d, f.x), f.y);
}
float tm_fbm(float2 p)
{
    float v = 0.0, a = 0.5;
    for (int k = 0; k < 4; k++) { v += a * tm_vnoise(p); p = p * 2.03 + 11.7; a *= 0.5; }
    return v / 0.9375;
}
// Voronoi: x = distancia al punto mas cercano, y = distancia al 2do, z = id aleatorio de la celda
float3 tm_voronoi(float2 p)
{
    float2 g = floor(p), f = frac(p);
    float d1 = 8.0, d2 = 8.0, id = 0.0;
    for (int y = -1; y <= 1; y++)
        for (int x = -1; x <= 1; x++)
        {
            float2 o = float2(x, y);
            float2 r = o + tm_hash22(g + o) - f;
            float d = dot(r, r);
            if (d < d1) { d2 = d1; d1 = d; id = tm_hash21(g + o + 3.7); }
            else if (d < d2) { d2 = d; }
        }
    return float3(sqrt(d1), sqrt(d2), id);
}
#endif
