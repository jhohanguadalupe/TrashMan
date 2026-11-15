// ============================================================================
//  TRASH MAN - Generador de modelos 3D low-poly en C++
//  Compilar:  g++ -O2 -std=c++17 trashman_models.cpp -o trashman_models
//  Ejecutar:  ./trashman_models        (crea la carpeta out/)
//
//  Salida:
//    out/<modelo>.obj  -> malla con colores por vertice ("v x y z r g b"),
//                         un "o" por parte (torso, head, legL, weapon...)
//    out/models.js     -> los mismos modelos en JSON para Three.js / navegador
//
//  Convenciones: Y arriba, el personaje mira hacia +Z, unidades en metros.
//  Cada parte guarda sus vertices RELATIVOS a su pivote (articulacion), asi en
//  JavaScript se puede animar (piernas, canones giratorios, garra...).
//  Las partes con sufijo _glow son emisivas (bobinas, filtros, gel...).
// ============================================================================
#include <algorithm>
#include <cmath>
#include <cstdio>
#include <deque>
#include <initializer_list>
#include <string>
#include <sys/stat.h>
#include <vector>
using namespace std;

static const float PI = 3.14159265f;

// ---------------------------------------------------------------- matematica
struct V3 { float x, y, z; };
static V3 operator+(V3 a, V3 b) { return {a.x + b.x, a.y + b.y, a.z + b.z}; }
static V3 operator-(V3 a, V3 b) { return {a.x - b.x, a.y - b.y, a.z - b.z}; }
static V3 operator*(V3 a, float k) { return {a.x * k, a.y * k, a.z * k}; }
static float dot(V3 a, V3 b) { return a.x * b.x + a.y * b.y + a.z * b.z; }
static V3 cross(V3 a, V3 b) { return {a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x}; }
static float len(V3 a) { return sqrtf(dot(a, a)); }
static V3 norm(V3 a) { float l = len(a); return l > 1e-8f ? a * (1.f / l) : V3{0, 1, 0}; }

struct Col { float r, g, b; };
static Col H(unsigned h) { return {((h >> 16) & 255) / 255.f, ((h >> 8) & 255) / 255.f, (h & 255) / 255.f}; }
static Col sh(Col c, float k) { return {min(1.f, c.r * k), min(1.f, c.g * k), min(1.f, c.b * k)}; }

// rotacion Euler: R = Rz * Ry * Rx
static V3 rotE(V3 p, V3 e) {
    float cx = cosf(e.x), sx = sinf(e.x), cy = cosf(e.y), sy = sinf(e.y), cz = cosf(e.z), sz = sinf(e.z);
    V3 q = {p.x, p.y * cx - p.z * sx, p.y * sx + p.z * cx};
    q = {q.x * cy + q.z * sy, q.y, -q.x * sy + q.z * cy};
    q = {q.x * cz - q.y * sz, q.x * sz + q.y * cz, q.z};
    return q;
}

// ------------------------------------------------------------------- malla
struct Tri { V3 a, b, c; Col col; };
struct Part { string name; V3 pivot; bool glow; vector<Tri> t; };
struct Model {
    string name;
    deque<Part> parts;  // deque: las referencias siguen validas al agregar partes
    Part& part(const string& n, V3 pv, bool g = false) { parts.push_back(Part{n, pv, g, {}}); return parts.back(); }
};

// triangulo orientado hacia afuera respecto a "ref" (punto interior)
static void T(Part& p, V3 a, V3 b, V3 c, V3 ref, Col col) {
    V3 n = cross(b - a, c - a);
    if (len(n) < 1e-9f) return;  // degenerado (apice de conos)
    V3 cen = (a + b + c) * (1.f / 3.f);
    if (dot(n, cen - ref) < 0) swap(b, c);
    p.t.push_back({a, b, c, col});
}
static void Q(Part& p, V3 a, V3 b, V3 c, V3 d, V3 ref, Col col) { T(p, a, b, c, ref, col); T(p, a, c, d, ref, col); }

// ------------------------------------------------------------- primitivas
static void box(Part& p, V3 c, V3 s, Col col, V3 rot = {0, 0, 0}) {
    V3 h = s * 0.5f, v[8];
    for (int i = 0; i < 8; i++) v[i] = rotE({(i & 1 ? h.x : -h.x), (i & 2 ? h.y : -h.y), (i & 4 ? h.z : -h.z)}, rot) + c;
    static const int f[6][4] = {{0, 1, 3, 2}, {4, 5, 7, 6}, {0, 1, 5, 4}, {2, 3, 7, 6}, {0, 2, 6, 4}, {1, 3, 7, 5}};
    for (auto& q : f) Q(p, v[q[0]], v[q[1]], v[q[2]], v[q[3]], c, col);
}
// cilindro / cono truncado entre dos puntos (r0 en a, r1 en b)
static void cyl(Part& p, V3 a, V3 b, float r0, float r1, Col col, int seg = 8, bool caps = true) {
    V3 d = norm(b - a), t = fabsf(d.y) < 0.9f ? V3{0, 1, 0} : V3{1, 0, 0};
    V3 u = norm(cross(d, t)), w = cross(d, u), ref = (a + b) * 0.5f;
    for (int i = 0; i < seg; i++) {
        float a0 = 2 * PI * i / seg, a1 = 2 * PI * (i + 1) / seg;
        V3 d0 = u * cosf(a0) + w * sinf(a0), d1 = u * cosf(a1) + w * sinf(a1);
        V3 p00 = a + d0 * r0, p01 = a + d1 * r0, p10 = b + d0 * r1, p11 = b + d1 * r1;
        Q(p, p00, p01, p11, p10, ref, col);
        if (caps) { T(p, a, p01, p00, ref, col); T(p, b, p10, p11, ref, col); }
    }
}
// elipsoide (o domo si t0..t1 no cubre 0..PI)
static void sph(Part& p, V3 c, V3 r, Col col, int lat = 5, int lon = 8, float t0 = 0, float t1 = PI, V3 rot = {0, 0, 0}) {
    auto P = [&](float th, float ph) {
        return rotE({r.x * sinf(th) * cosf(ph), r.y * cosf(th), r.z * sinf(th) * sinf(ph)}, rot) + c;
    };
    for (int i = 0; i < lat; i++) {
        float th0 = t0 + (t1 - t0) * i / lat, th1 = t0 + (t1 - t0) * (i + 1) / lat;
        for (int j = 0; j < lon; j++) {
            float p0 = 2 * PI * j / lon, p1 = 2 * PI * (j + 1) / lon;
            Q(p, P(th0, p0), P(th0, p1), P(th1, p1), P(th1, p0), c, col);
        }
    }
}
// toro / arco de toro en el plano XY (eje Z). u0..u1 = tramo del arco
static void tor(Part& p, V3 c, float R, float r, Col col, V3 rot = {0, 0, 0}, float u0 = 0, float u1 = 2 * PI, int seg = 12, int tube = 5) {
    auto P = [&](float u, float v) {
        return rotE({(R + r * cosf(v)) * cosf(u), (R + r * cosf(v)) * sinf(u), r * sinf(v)}, rot) + c;
    };
    for (int i = 0; i < seg; i++) {
        float ua = u0 + (u1 - u0) * i / seg, ub = u0 + (u1 - u0) * (i + 1) / seg;
        V3 ca = rotE({R * cosf(ua), R * sinf(ua), 0}, rot) + c, cb = rotE({R * cosf(ub), R * sinf(ub), 0}, rot) + c;
        V3 ref = (ca + cb) * 0.5f;
        for (int j = 0; j < tube; j++) {
            float v0 = 2 * PI * j / tube, v1 = 2 * PI * (j + 1) / tube;
            Q(p, P(ua, v0), P(ua, v1), P(ub, v1), P(ub, v0), ref, col);
        }
    }
}

// =========================================================== PERSONAJES
struct CD {
    string name;
    Col skin, hair, hair2, shirt, vest, vestAcc, pants, boots, gloves, pad, pack, packAcc, coil, wBody, wAcc, cap, beard;
    float b = 1.f;                   // corpulencia (ancho de torso)
    int hairStyle = 0;               // 0 media melena, 1 corto, 2 canoso+barba, 3 casco hazmat
    int headgear = 0;                // bit1 respirador, bit2 gorra
    int claw = 0;                    // 0 anillo en C, 1 pinza de dos garras
    int weapon = 0;                  // 0 recolector con bobina, 1 gatling de gel
    bool hazard = false, pipes = false, sparks = false, angry = false, fullSleeve = false;
};

static void addWeapon(Model& m, const CD& d) {
    V3 pv = {0, 1.22f, 0.4f};
    Part& w = m.part("weapon", pv);
    Part& g = m.part("weapon_glow", pv, true);
    Col steel = H(0x8c9198), dark = sh(d.wBody, 0.6f);
    // cuerpo comun: empunadura, receptor, riel, culata y cable a la mochila
    box(w, {0, 1.05f, 0.3f}, {0.07f, 0.22f, 0.09f}, dark, {-0.25f, 0, 0});
    box(w, {0, 1.22f, 0.33f}, {0.2f, 0.26f, 0.46f}, d.wBody);
    box(w, {0, 1.37f, 0.28f}, {0.1f, 0.05f, 0.3f}, d.wAcc);
    box(w, {0, 1.2f, 0.06f}, {0.11f, 0.14f, 0.14f}, sh(d.wBody, 0.75f));
    cyl(w, {0, 1.15f, 0.0f}, {0, 1.1f, -0.2f}, 0.018f, 0.018f, H(0x222222), 5);
    box(w, {0.0f, 1.22f, 0.56f}, {0.23f, 0.12f, 0.04f}, d.wAcc);

    if (d.weapon == 0) {
        cyl(w, {0, 1.22f, 0.55f}, {0, 1.22f, 1.1f}, 0.055f, 0.055f, sh(d.wBody, 0.8f), 8);
        for (int i = 0; i < 9; i++) tor(g, {0, 1.22f, 0.62f + i * 0.045f}, 0.078f, 0.013f, d.coil, {0, 0, 0}, 0, 2 * PI, 10, 4);
        cyl(g, {0, 1.22f, 0.6f}, {0, 1.22f, 1.05f}, 0.04f, 0.04f, sh(d.coil, 0.55f), 6);
        for (float z : {0.58f, 1.04f}) cyl(w, {0, 1.22f, z}, {0, 1.22f, z + 0.04f}, 0.09f, 0.09f, d.wAcc, 8);
        cyl(w, {0, 1.22f, 1.1f}, {0, 1.22f, 1.24f}, 0.035f, 0.035f, steel, 6);
        box(w, {0, 1.22f, 1.25f}, {0.09f, 0.09f, 0.06f}, d.wBody);
        // garra
        Part& cl = m.part("claw", {0, 1.22f, 1.25f});
        Part& cg = m.part("claw_glow", {0, 1.22f, 1.25f}, true);
        if (d.claw == 0) {
            tor(cl, {0, 1.22f, 1.41f}, 0.16f, 0.028f, steel, {0, -PI / 2, 0}, 0.75f, 2 * PI - 0.75f, 14, 5);
        } else {
            for (float s : {1.f, -1.f}) {
                V3 p0 = {0, 1.22f + s * 0.04f, 1.25f}, p1 = {0, 1.22f + s * 0.14f, 1.33f};
                V3 p2 = {0, 1.22f + s * 0.17f, 1.5f}, p3 = {0, 1.22f + s * 0.07f, 1.62f};
                cyl(cl, p0, p1, 0.035f, 0.03f, steel, 6);
                cyl(cl, p1, p2, 0.03f, 0.03f, sh(steel, 1.1f), 6);
                cyl(cl, p2, p3, 0.03f, 0.01f, steel, 6);
                sph(cl, p1, {0.04f, 0.04f, 0.04f}, d.wAcc, 3, 6);
            }
        }
        if (d.sparks) {  // chispas electricas alrededor de la garra
            for (int i = 0; i < 10; i++) {
                float a = i * 0.9f, r = 0.2f + 0.05f * (i % 3);
                box(cg, {0.05f * cosf(a * 2), 1.22f + r * sinf(a), 1.43f + r * cosf(a)}, {0.012f, 0.07f, 0.012f}, H(0x9ffcff), {a, a * 0.5f, a * 1.3f});
            }
        }
    } else {
        // gatling de gel: tanque lateral, manifold y canones giratorios
        box(w, {0, 1.17f, 0.12f}, {0.09f, 0.16f, 0.28f}, sh(d.wBody, 0.8f));
        cyl(g, {0.15f, 1.1f, 0.42f}, {0.15f, 1.33f, 0.42f}, 0.055f, 0.055f, d.coil, 8);
        cyl(w, {0.15f, 1.07f, 0.42f}, {0.15f, 1.1f, 0.42f}, 0.065f, 0.065f, d.wAcc, 8);
        cyl(w, {0.15f, 1.33f, 0.42f}, {0.15f, 1.36f, 0.42f}, 0.065f, 0.065f, d.wAcc, 8);
        cyl(w, {0.0f, 1.22f, 0.55f}, {0, 1.22f, 0.64f}, 0.11f, 0.11f, d.wBody, 8);
        cyl(w, {0.1f, 1.26f, 0.42f}, {0.15f, 1.3f, 0.42f}, 0.015f, 0.015f, steel, 4);
        Part& br = m.part("barrels", {0, 1.22f, 0.9f});
        Part& bg = m.part("barrels_glow", {0, 1.22f, 0.9f}, true);
        for (int k = 0; k < 4; k++) {
            float a = k * PI / 2 + PI / 4, x = cosf(a) * 0.07f, y = 1.22f + sinf(a) * 0.07f;
            cyl(bg, {x, y, 0.66f}, {x, y, 1.14f}, 0.033f, 0.033f, d.coil, 8);
            cyl(br, {x, y, 1.14f}, {x, y, 1.26f}, 0.038f, 0.03f, steel, 8);
        }
        cyl(br, {0, 1.22f, 0.64f}, {0, 1.22f, 1.2f}, 0.03f, 0.03f, steel, 6);
        for (float z : {0.68f, 0.9f, 1.12f}) cyl(br, {0, 1.22f, z}, {0, 1.22f, z + 0.035f}, 0.115f, 0.115f, d.wBody, 8);
    }
}

static Model buildChar(const CD& d) {
    Model m; m.name = d.name;
    float b = d.b;
    Col steel = H(0x8c9198), dkc = H(0x1b1b1b);

    // ---- torso
    Part& to = m.part("torso", {0, 1.0f, 0});
    Part& tg = m.part("torso_glow", {0, 1.0f, 0}, true);
    box(to, {0, 0.98f, 0}, {0.36f * b, 0.16f, 0.24f}, d.pants);
    box(to, {0, 1.26f, 0}, {0.44f * b, 0.5f, 0.28f}, d.shirt);
    box(to, {0, 1.28f, 0.005f}, {0.47f * b, 0.44f, 0.30f}, d.vest);
    box(to, {0, 1.0f, 0}, {0.40f * b, 0.07f, 0.27f}, dkc);  // cinturon
    if (d.hazard) {
        for (int i = -3; i <= 3; i++) box(to, {i * 0.065f * b, 1.28f, 0.158f}, {0.03f, 0.34f, 0.008f}, d.vestAcc, {0, 0, 0.6f});
    } else {
        for (float s : {-1.f, 1.f}) box(to, {s * 0.12f * b, 1.28f, 0.158f}, {0.04f, 0.44f, 0.008f}, d.vestAcc);
    }
    for (float s : {-1.f, 1.f}) {
        box(to, {s * 0.1f * b, 1.18f, 0.17f}, {0.12f, 0.1f, 0.04f}, sh(d.vest, 0.8f));
        sph(to, {s * (0.235f * b + 0.06f), 1.47f, 0}, {0.13f, 0.09f, 0.13f}, d.pad, 4, 8);
    }
    if (d.weapon == 1) {  // paneles RB y tiras de gel
        box(to, {0, 1.32f, 0.162f}, {0.16f, 0.1f, 0.01f}, d.packAcc);
        for (float s : {-1.f, 1.f}) box(tg, {s * 0.19f * b, 1.3f, 0.16f}, {0.025f, 0.3f, 0.01f}, d.vestAcc);
    }

    // ---- cabeza
    Part& hd = m.part("head", {0, 1.5f, 0});
    Part& hg = m.part("head_glow", {0, 1.5f, 0}, true);
    cyl(hd, {0, 1.45f, 0}, {0, 1.56f, 0}, 0.065f, 0.06f, d.skin, 6);
    sph(hd, {0, 1.67f, 0}, {0.12f, 0.14f, 0.13f}, d.skin, 5, 8);
    for (float s : {-1.f, 1.f}) {
        box(hd, {s * 0.05f, 1.675f, 0.122f}, {0.035f, 0.022f, 0.02f}, H(0x141414));
        box(hd, {s * 0.12f, 1.66f, 0.0f}, {0.02f, 0.05f, 0.04f}, sh(d.skin, 0.92f));
        if (d.angry) box(hd, {s * 0.05f, 1.703f, 0.126f}, {0.065f, 0.016f, 0.02f}, sh(d.hair, 0.5f), {0, 0, s * 0.35f});
    }
    box(hd, {0, 1.645f, 0.135f}, {0.025f, 0.04f, 0.03f}, sh(d.skin, 0.9f));
    if (d.hairStyle == 0) {
        sph(hd, {0, 1.7f, -0.01f}, {0.145f, 0.14f, 0.15f}, d.hair, 4, 8, 0, 1.4f);
        box(hd, {-0.13f, 1.62f, -0.02f}, {0.045f, 0.2f, 0.2f}, d.hair);
        box(hd, {0.13f, 1.62f, -0.02f}, {0.045f, 0.2f, 0.2f}, d.hair2);
        box(hd, {0, 1.6f, -0.11f}, {0.28f, 0.24f, 0.06f}, d.hair);
        box(hd, {0.02f, 1.775f, 0.115f}, {0.22f, 0.05f, 0.06f}, d.hair2, {0.3f, 0, 0.15f});
    } else if (d.hairStyle == 1) {
        sph(hd, {0, 1.7f, -0.005f}, {0.128f, 0.125f, 0.135f}, d.hair, 4, 8, 0, 1.35f);
        box(hd, {0, 1.64f, -0.09f}, {0.22f, 0.14f, 0.05f}, d.hair);
        for (float s : {-1.f, 1.f}) box(hd, {s * 0.118f, 1.67f, -0.03f}, {0.02f, 0.1f, 0.12f}, d.hair);
    } else if (d.hairStyle == 2) {
        for (float s : {-1.f, 1.f}) box(hd, {s * 0.125f, 1.65f, -0.02f}, {0.03f, 0.1f, 0.14f}, d.hair);
        sph(hd, {0, 1.585f, 0.06f}, {0.125f, 0.095f, 0.1f}, d.beard, 4, 8);
        box(hd, {0, 1.628f, 0.125f}, {0.1f, 0.03f, 0.04f}, d.beard);
        box(hd, {-0.04f, 1.69f, 0.128f}, {0.01f, 0.07f, 0.01f}, H(0xb04040), {0, 0, 0.5f});
    } else if (d.hairStyle == 3) {
        sph(hd, {0, 1.69f, 0}, {0.165f, 0.165f, 0.165f}, d.cap, 5, 10, 0, 1.5f);
        for (float s : {-1.f, 1.f}) cyl(hd, {s * 0.12f, 1.64f, 0}, {s * 0.2f, 1.64f, 0}, 0.06f, 0.06f, d.pad, 8);
        box(hd, {0, 1.6f, -0.13f}, {0.26f, 0.12f, 0.06f}, d.cap);
        box(hg, {0, 1.775f, 0.145f}, {0.2f, 0.03f, 0.04f}, d.vestAcc);
        box(hd, {0, 1.745f, 0.125f}, {0.2f, 0.04f, 0.05f}, d.hair);  // flequillo
    }
    if (d.headgear & 1) {  // respirador con filtros brillantes
        sph(hd, {0, 1.6f, 0.1f}, {0.1f, 0.07f, 0.07f}, H(0x5a5f66), 4, 8);
        for (float s : {-1.f, 1.f}) {
            cyl(hd, {s * 0.07f, 1.59f, 0.15f}, {s * 0.07f, 1.59f, 0.19f}, 0.035f, 0.035f, dkc, 8);
            cyl(hg, {s * 0.07f, 1.59f, 0.19f}, {s * 0.07f, 1.59f, 0.205f}, 0.028f, 0.028f, d.coil, 8);
        }
        box(hd, {0, 1.66f, 0.0f}, {0.27f, 0.025f, 0.26f}, dkc);  // correa
    }
    if (d.headgear & 2) {  // gorra con parche
        sph(hd, {0, 1.73f, 0}, {0.15f, 0.115f, 0.155f}, d.cap, 4, 10, 0, 1.6f);
        box(hd, {0, 1.725f, 0.16f}, {0.2f, 0.015f, 0.12f}, d.cap, {0.12f, 0, 0});
        box(hd, {0, 1.755f, 0.155f}, {0.1f, 0.05f, 0.015f}, H(0x3f8f3f));
    }

    // ---- brazos (sujetan el arma)
    struct ArmDef { const char* n; V3 S, E, Hd; };
    float sx = 0.235f * b + 0.065f;
    ArmDef arms[2] = {{"armR", {-sx, 1.43f, 0}, {-(sx + 0.07f), 1.1f, 0.15f}, {-0.07f, 1.08f, 0.38f}},
                      {"armL", {sx, 1.43f, 0}, {sx + 0.07f, 1.2f, 0.3f}, {0.09f, 1.25f, 0.74f}}};
    float sb = 0.8f + 0.2f * b;
    for (auto& a : arms) {
        Part& ar = m.part(a.n, a.S);
        cyl(ar, a.S, a.Hd * 0 + a.E, 0.06f * sb, 0.052f * sb, d.shirt, 7);
        sph(ar, a.E, {0.058f * sb, 0.058f * sb, 0.058f * sb}, d.fullSleeve ? d.pad : d.shirt, 3, 6);
        cyl(ar, a.E, a.Hd, 0.05f * sb, 0.045f * sb, d.fullSleeve ? d.shirt : d.skin, 7);
        cyl(ar, a.Hd + (a.E - a.Hd) * 0.3f, a.Hd + (a.E - a.Hd) * 0.1f, 0.056f * sb, 0.056f * sb, d.gloves, 7);
        sph(ar, a.Hd, {0.066f, 0.06f, 0.066f}, d.gloves, 3, 7);
    }

    // ---- piernas
    for (float s : {-1.f, 1.f}) {
        float x = s * 0.12f * (0.8f + 0.2f * b);
        Part& lg = m.part(s < 0 ? "legR" : "legL", {x, 0.95f, 0});
        float k = 0.85f + 0.15f * b;
        cyl(lg, {x, 0.95f, 0}, {x, 0.55f, 0.03f}, 0.085f * k, 0.07f * k, d.pants, 7);
        box(lg, {x, 0.55f, 0.075f}, {0.12f, 0.12f, 0.06f}, d.pad);
        cyl(lg, {x, 0.55f, 0.03f}, {x, 0.13f, 0}, 0.065f * k, 0.055f * k, d.pants, 7);
        if (d.hazard) for (int i = 0; i < 3; i++) box(lg, {x, 0.8f - i * 0.07f, 0.07f * k}, {0.16f, 0.035f, 0.02f}, d.vestAcc, {0, 0, 0.5f});
        box(lg, {x, 0.2f, 0.01f}, {0.13f, 0.18f, 0.14f}, d.boots);   // caña
        box(lg, {x, 0.07f, 0.06f}, {0.13f, 0.14f, 0.26f}, d.boots);  // bota
        box(lg, {x, 0.015f, 0.065f}, {0.14f, 0.03f, 0.29f}, dkc);    // suela
        box(lg, {x, 0.21f, 0.085f}, {0.12f, 0.1f, 0.03f}, sh(d.pad, 0.9f));  // rodillera/canilla
    }

    // ---- mochila
    Part& bp = m.part("backpack", {0, 1.3f, -0.2f});
    box(bp, {0, 1.28f, -0.25f}, {0.38f * (0.8f + 0.2f * b), 0.5f, 0.2f}, d.pack);
    box(bp, {0, 1.52f, -0.25f}, {0.36f * (0.8f + 0.2f * b), 0.06f, 0.22f}, sh(d.pack, 0.8f));
    box(bp, {0, 1.28f, -0.352f}, {0.14f, 0.14f, 0.012f}, d.packAcc);
    for (float s : {-1.f, 1.f}) {
        box(bp, {s * 0.12f, 1.3f, -0.14f}, {0.05f, 0.45f, 0.04f}, sh(d.pack, 0.6f));
        box(bp, {s * 0.2f, 1.13f, -0.27f}, {0.07f, 0.14f, 0.14f}, sh(d.pack, 0.85f));
        if (d.pipes) {
            cyl(bp, {s * 0.1f, 1.5f, -0.3f}, {s * 0.1f, 1.84f, -0.3f}, 0.03f, 0.03f, steel, 6);
            cyl(bp, {s * 0.1f, 1.84f, -0.3f}, {s * 0.1f, 1.88f, -0.3f}, 0.026f, 0.026f, H(0xb87333), 6);
        }
    }

    // ---- cinturon: bolsas y mini-monstruos colgantes
    Part& be = m.part("belt", {0, 1.0f, 0});
    for (float s : {-1.f, 1.f}) {
        box(be, {s * 0.2f * b, 0.95f, 0.13f}, {0.1f, 0.12f, 0.06f}, sh(d.vest, 0.7f));
        Col cc[2] = {H(0xd04030), H(0x30a0b0)};
        int ci = s < 0 ? 0 : 1;
        cyl(be, {s * 0.25f * b, 0.9f, 0.05f}, {s * 0.25f * b, 0.86f, 0.05f}, 0.004f, 0.004f, steel, 4);
        sph(be, {s * 0.25f * b, 0.82f, 0.05f}, {0.04f, 0.04f, 0.04f}, cc[ci], 3, 6);
        sph(be, {s * 0.25f * b, 0.83f, 0.085f}, {0.012f, 0.012f, 0.012f}, H(0xfff2a0), 2, 4);
    }

    addWeapon(m, d);
    return m;
}

// ============================================================ PROPS / MONSTRUOS
static Model mkCan() {
    Model m; m.name = "prop_lata";
    Part& p = m.part("body", {0, 0.06f, 0});
    cyl(p, {0, 0, 0}, {0, 0.12f, 0}, 0.04f, 0.04f, H(0xd02020), 10);
    cyl(p, {0, 0.12f, 0}, {0, 0.125f, 0}, 0.034f, 0.034f, H(0xc8c8c8), 10);
    tor(p, {0, 0.125f, 0}, 0.036f, 0.004f, H(0xe0e0e0), {PI / 2, 0, 0}, 0, 2 * PI, 10, 4);
    box(p, {0, 0.06f, 0.04f}, {0.03f, 0.05f, 0.004f}, H(0xf0f0f0));
    return m;
}
static Model mkTooth() {
    Model m; m.name = "prop_diente_monstruo";
    Part& p = m.part("body", {0, 0.06f, 0});
    sph(p, {0, 0.08f, 0}, {0.055f, 0.05f, 0.045f}, H(0xf4f0e0), 4, 8);
    for (float s : {-1.f, 1.f}) cyl(p, {s * 0.025f, 0.05f, 0}, {s * 0.02f, 0.0f, 0}, 0.022f, 0.006f, H(0xe8dcc0), 6);
    for (float s : {-1.f, 1.f}) box(p, {s * 0.02f, 0.09f, 0.042f}, {0.014f, 0.012f, 0.01f}, H(0x202020));
    box(p, {0, 0.06f, 0.044f}, {0.04f, 0.01f, 0.01f}, H(0x602020));
    return m;
}
static Model mkVial() {
    Model m; m.name = "prop_vial_gel";
    Part& p = m.part("body", {0, 0.05f, 0});
    Part& g = m.part("body_glow", {0, 0.05f, 0}, true);
    cyl(g, {0, 0, 0}, {0, 0.1f, 0}, 0.03f, 0.03f, H(0xff9a1a), 8);
    cyl(p, {0, 0.1f, 0}, {0, 0.125f, 0}, 0.024f, 0.024f, H(0x7a4a22), 8);
    cyl(p, {0, -0.005f, 0}, {0, 0, 0}, 0.033f, 0.033f, H(0x3a3a3a), 8);
    return m;
}
static Model mkMushroom() {
    Model m; m.name = "monstruo_hongo";
    Part& p = m.part("body", {0, 0, 0});
    sph(p, {0, 0, 0}, {0.22f, 0.08f, 0.22f}, H(0x5a3a22), 3, 10, 0, PI / 2);
    cyl(p, {0, 0, 0}, {0, 0.3f, 0}, 0.1f, 0.05f, H(0xe8d8b0), 8);
    sph(p, {0, 0.3f, 0}, {0.22f, 0.13f, 0.22f}, H(0xd2612a), 3, 10, 0, PI / 2);
    for (int i = 0; i < 5; i++) sph(p, {0.12f * cosf(i * 1.3f), 0.36f - 0.02f * (i % 2), 0.12f * sinf(i * 1.3f)}, {0.03f, 0.015f, 0.03f}, H(0xf0d8a0), 2, 6);
    for (float s : {-1.f, 1.f}) {
        box(p, {s * 0.04f, 0.2f, 0.085f}, {0.025f, 0.03f, 0.01f}, H(0x202020));
        cyl(p, {s * 0.3f, 0.0f, 0.1f}, {s * 0.33f, 0.18f, 0.12f}, 0.03f, 0.015f, H(0xb8956a), 5);
        // mini hongos
        cyl(p, {s * 0.28f, 0, -0.15f}, {s * 0.28f, 0.12f, -0.15f}, 0.025f, 0.02f, H(0xe8d8b0), 5);
        sph(p, {s * 0.28f, 0.12f, -0.15f}, {0.07f, 0.04f, 0.07f}, H(0xd2612a), 3, 7, 0, PI / 2);
    }
    return m;
}
static Model mkSlime() {
    Model m; m.name = "monstruo_baba_toxica";
    Part& p = m.part("body", {0, 0, 0});
    Part& g = m.part("body_glow", {0, 0, 0}, true);
    sph(p, {0, 0.32f, 0}, {0.3f, 0.34f, 0.26f}, H(0x58c030), 5, 10);
    sph(p, {0, 0.05f, 0}, {0.36f, 0.08f, 0.32f}, H(0x3f9a24), 3, 10);
    for (float s : {-1.f, 1.f}) {
        sph(p, {s * 0.36f, 0.4f, 0.0f}, {0.09f, 0.16f, 0.09f}, H(0x58c030), 3, 6, 0, PI, {0, 0, s * 0.6f});
        cyl(p, {s * 0.12f, 0.04f, 0.3f}, {s * 0.12f, -0.02f, 0.3f}, 0.05f, 0.02f, H(0x58c030), 5);
        sph(g, {s * 0.1f, 0.42f, 0.22f}, {0.055f, 0.055f, 0.03f}, H(0xfff070), 3, 6);
        box(p, {s * 0.1f, 0.42f, 0.245f}, {0.02f, 0.03f, 0.01f}, H(0x101010));
    }
    box(p, {0, 0.26f, 0.255f}, {0.16f, 0.05f, 0.015f}, H(0x1c3a10));
    for (int i = 0; i < 3; i++) box(g, {0, 0.42f - i * 0.07f, -0.02f}, {0.02f, 0.05f, 0.02f}, H(0xeeeed0));  // costillas visibles
    return m;
}
static Model mkTrashMonster() {
    Model m; m.name = "monstruo_basura";
    Part& p = m.part("body", {0, 0.4f, 0});
    Part& g = m.part("body_glow", {0, 0.4f, 0}, true);
    sph(p, {0, 0.4f, 0}, {0.3f, 0.33f, 0.27f}, H(0x4a9a3a), 5, 10);
    for (int i = 0; i < 3; i++) {
        float x = (i - 1) * 0.11f, y = i == 1 ? 0.6f : 0.52f;
        sph(p, {x, y, 0.2f}, {0.06f, 0.06f, 0.04f}, H(0xf4f4f0), 3, 7);
        sph(g, {x, y, 0.235f}, {0.025f, 0.025f, 0.015f}, H(0xffd020), 2, 5);
    }
    box(p, {0, 0.3f, 0.255f}, {0.2f, 0.07f, 0.02f}, H(0x1c1c1c));
    for (int i = -2; i <= 2; i++) box(p, {i * 0.035f, 0.325f, 0.268f}, {0.02f, 0.03f, 0.01f}, H(0xf4f0d8));
    for (float s : {-1.f, 1.f}) {
        cyl(p, {s * 0.26f, 0.45f, 0}, {s * 0.4f, 0.28f, 0.1f}, 0.05f, 0.04f, H(0x4a9a3a), 6);
        sph(p, {s * 0.4f, 0.28f, 0.1f}, {0.07f, 0.07f, 0.07f}, H(0x3a7a2a), 3, 6);
        cyl(p, {s * 0.12f, 0.12f, 0}, {s * 0.12f, 0.03f, 0.04f}, 0.07f, 0.06f, H(0x3a7a2a), 6);
        box(p, {s * 0.12f, 0.02f, 0.08f}, {0.12f, 0.04f, 0.16f}, H(0x2a5a20));
        cyl(p, {s * 0.1f, 0.7f, 0}, {s * 0.14f, 0.85f, 0}, 0.04f, 0.0f, H(0xe8dcc0), 5);  // cuernos
    }
    cyl(p, {0.22f, 0.5f, -0.1f}, {0.22f, 0.62f, -0.1f}, 0.045f, 0.045f, H(0xd02020), 8);   // lata incrustada
    box(p, {-0.2f, 0.6f, -0.05f}, {0.14f, 0.1f, 0.12f}, H(0xb08a58), {0.3f, 0.4f, 0.2f});  // carton
    return m;
}
static Model mkCap() {
    Model m; m.name = "prop_gorra_recicla";
    Part& p = m.part("body", {0, 0.1f, 0});
    sph(p, {0, 0.08f, 0}, {0.15f, 0.12f, 0.155f}, H(0x56693a), 4, 10, 0, 1.6f);
    box(p, {0, 0.07f, 0.16f}, {0.2f, 0.015f, 0.12f}, H(0x56693a), {0.12f, 0, 0});
    box(p, {0, 0.1f, 0.155f}, {0.1f, 0.05f, 0.015f}, H(0x3f8f3f));
    box(p, {0.07f, 0.075f, 0.16f}, {0.03f, 0.03f, 0.012f}, H(0xe8e0d0));
    return m;
}
static Model mkWeldHelmet() {
    Model m; m.name = "prop_casco_soldador";
    Part& p = m.part("body", {0, 0.1f, 0});
    Part& g = m.part("body_glow", {0, 0.1f, 0}, true);
    sph(p, {0, 0.1f, 0}, {0.17f, 0.17f, 0.17f}, H(0xe0a81a), 5, 10, 0, 2.2f);
    box(p, {0, 0.1f, 0.15f}, {0.22f, 0.12f, 0.04f}, H(0x2a2a2a));
    box(g, {0, 0.1f, 0.172f}, {0.18f, 0.07f, 0.01f}, H(0x2a9aa8));
    box(p, {0, 0.19f, 0.14f}, {0.14f, 0.04f, 0.02f}, H(0xd8d8c8));
    for (float s : {-1.f, 1.f}) cyl(p, {s * 0.16f, 0.1f, 0}, {s * 0.2f, 0.1f, 0}, 0.04f, 0.04f, H(0x5a5f66), 6);
    return m;
}

// =============================================================== EXPORTACION
static void exportObj(const Model& m, const string& dir) {
    FILE* f = fopen((dir + "/" + m.name + ".obj").c_str(), "w");
    if (!f) return;
    fprintf(f, "# %s - generado por trashman_models.cpp (vertex colors: v x y z r g b)\n", m.name.c_str());
    int base = 1;
    for (auto& p : m.parts) {
        fprintf(f, "o %s%s\n", p.name.c_str(), "");
        fprintf(f, "# pivot %.4f %.4f %.4f glow=%d\n", p.pivot.x, p.pivot.y, p.pivot.z, p.glow ? 1 : 0);
        for (auto& t : p.t)
            for (V3 v : {t.a, t.b, t.c}) {
                V3 q = v - p.pivot;
                fprintf(f, "v %.4f %.4f %.4f %.3f %.3f %.3f\n", q.x, q.y, q.z, t.col.r, t.col.g, t.col.b);
            }
        for (size_t i = 0; i < p.t.size(); i++, base += 3) fprintf(f, "f %d %d %d\n", base, base + 1, base + 2);
    }
    fclose(f);
}
static void exportJs(const vector<Model>& ms, const string& path) {
    FILE* f = fopen(path.c_str(), "w");
    if (!f) return;
    fprintf(f, "window.TM_MODELS = {\n");
    for (size_t mi = 0; mi < ms.size(); mi++) {
        const Model& m = ms[mi];
        fprintf(f, "\"%s\":{\"parts\":[\n", m.name.c_str());
        for (size_t pi = 0; pi < m.parts.size(); pi++) {
            const Part& p = m.parts[pi];
            fprintf(f, "{\"n\":\"%s\",\"pivot\":[%.4f,%.4f,%.4f],\"glow\":%s,\"p\":[", p.name.c_str(), p.pivot.x, p.pivot.y, p.pivot.z, p.glow ? "true" : "false");
            bool first = true;
            for (auto& t : p.t)
                for (V3 v : {t.a, t.b, t.c}) {
                    V3 q = v - p.pivot;
                    fprintf(f, "%s%.3f,%.3f,%.3f", first ? "" : ",", q.x, q.y, q.z);
                    first = false;
                }
            fprintf(f, "],\"c\":[");
            first = true;
            for (auto& t : p.t)
                for (int k = 0; k < 3; k++) {
                    fprintf(f, "%s%.2f,%.2f,%.2f", first ? "" : ",", t.col.r, t.col.g, t.col.b);
                    first = false;
                }
            fprintf(f, "]}%s\n", pi + 1 < m.parts.size() ? "," : "");
        }
        fprintf(f, "]}%s\n", mi + 1 < ms.size() ? "," : "");
    }
    fprintf(f, "};\n");
    fclose(f);
}

int main() {
    vector<Model> models;

    CD a;  // 1) Colector de chatarra electrico (pelo verde/morado, respirador)
    a.name = "personaje_chatarra_electrica";
    a.skin = H(0xd9a07a); a.hair = H(0x31b25a); a.hair2 = H(0x7a3fa0); a.shirt = H(0x6b6f66);
    a.vest = H(0x6a8f2a); a.vestAcc = H(0xe8a020); a.pants = H(0x4f5a44); a.boots = H(0x1e1e20);
    a.gloves = H(0x2a2a2a); a.pad = H(0x7b7f86); a.pack = H(0x8c9096); a.packAcc = H(0x4a4f55);
    a.coil = H(0x39ff6a); a.wBody = H(0x4a6b34); a.wAcc = H(0x2f3a2a); a.cap = H(0x5a6b3a); a.beard = a.hair;
    a.b = 0.9f; a.hairStyle = 0; a.headgear = 1; a.claw = 0; a.weapon = 0; a.sparks = true;
    models.push_back(buildChar(a));

    CD c;  // 2) Compactador de residuos pesado (traje amarillo/hazard)
    c.name = "personaje_compactador_pesado";
    c.skin = H(0xc99372); c.hair = H(0x1c1c22); c.hair2 = c.hair; c.shirt = H(0x4b525c);
    c.vest = H(0xe0a81a); c.vestAcc = H(0x1b1b1b); c.pants = H(0x3d5a80); c.boots = H(0x6b4226);
    c.gloves = H(0xc99a2a); c.pad = H(0x5d6670); c.pack = H(0xd7a31a); c.packAcc = H(0x4a8a3a);
    c.coil = H(0x20e5ff); c.wBody = H(0xb8892a); c.wAcc = H(0x2a2a2a); c.cap = H(0x56693a); c.beard = c.hair;
    c.b = 1.2f; c.hairStyle = 1; c.headgear = 0; c.claw = 1; c.weapon = 0; c.hazard = true;
    models.push_back(buildChar(c));

    CD v;  // 3) Veterano barbudo - lanza-residuos mecanico
    v.name = "personaje_veterano_lanzaresiduos";
    v.skin = H(0xd2a07c); v.hair = H(0xc9c9c9); v.hair2 = v.hair; v.shirt = H(0x4f6b2f);
    v.vest = H(0xe86a10); v.vestAcc = H(0xd8d8c8); v.pants = H(0x3e5f8a); v.boots = H(0x6b4226);
    v.gloves = H(0x4a3a2a); v.pad = H(0x8a8f96); v.pack = H(0x6e6232); v.packAcc = H(0x2f8a3a);
    v.coil = H(0xffb020); v.wBody = H(0x8a7a2a); v.wAcc = H(0xe86a10); v.cap = H(0x56693a); v.beard = H(0xd8d8d8);
    v.b = 1.3f; v.hairStyle = 2; v.headgear = 2; v.claw = 1; v.weapon = 0; v.pipes = true; v.angry = true;
    models.push_back(buildChar(v));

    CD r;  // 4) Unidad de rescate bioquimico - gatling de gel
    r.name = "personaje_rescate_bioquimico";
    r.skin = H(0xe0b090); r.hair = H(0x1a1a1a); r.hair2 = r.hair; r.shirt = H(0x1f7a7a);
    r.vest = H(0xc8b88a); r.vestAcc = H(0xff8a1a); r.pants = H(0x1f7a7a); r.boots = H(0x3a3a2a);
    r.gloves = H(0x2a6a6a); r.pad = H(0xc8b88a); r.pack = H(0xc8b88a); r.packAcc = H(0x1f7a7a);
    r.coil = H(0xff9a1a); r.wBody = H(0x2a8a80); r.wAcc = H(0x3a3a3a); r.cap = H(0x1f7a7a); r.beard = r.hair;
    r.b = 1.0f; r.hairStyle = 3; r.headgear = 0; r.weapon = 1; r.fullSleeve = true;
    models.push_back(buildChar(r));

    models.push_back(mkTrashMonster());
    models.push_back(mkSlime());
    models.push_back(mkMushroom());
    models.push_back(mkCan());
    models.push_back(mkTooth());
    models.push_back(mkVial());
    models.push_back(mkCap());
    models.push_back(mkWeldHelmet());

    mkdir("out", 0755);
    printf("%-36s %6s %6s   bbox (min -> max)\n", "modelo", "partes", "tris");
    bool ok = true;
    for (auto& m : models) {
        exportObj(m, "out");
        int tris = 0;
        V3 lo = {1e9f, 1e9f, 1e9f}, hi = {-1e9f, -1e9f, -1e9f};
        for (auto& p : m.parts)
            for (auto& t : p.t) {
                tris++;
                for (V3 q : {t.a, t.b, t.c}) {
                    if (!isfinite(q.x) || !isfinite(q.y) || !isfinite(q.z)) ok = false;
                    lo = {min(lo.x, q.x), min(lo.y, q.y), min(lo.z, q.z)};
                    hi = {max(hi.x, q.x), max(hi.y, q.y), max(hi.z, q.z)};
                }
            }
        printf("%-36s %6zu %6d   (%.2f %.2f %.2f) -> (%.2f %.2f %.2f)\n", m.name.c_str(), m.parts.size(), tris, lo.x, lo.y, lo.z, hi.x, hi.y, hi.z);
    }
    exportJs(models, "out/models.js");
    printf(ok ? "OK: todas las mallas son finitas\n" : "ERROR: hay vertices NaN/inf\n");
    return ok ? 0 : 1;
}
