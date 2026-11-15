// CIUDAD - EDIFICIO: fachada con ventanas procedurales; algunas se encienden de noche.
// Funciona sobre cubos escalados (cada cara usa coordenadas de mundo, las ventanas no se estiran).
Shader "TrashMan/CityBuilding"
{
    Properties
    {
        _Wall ("Pared", Color) = (0.55, 0.57, 0.62, 1)
        _WallDark ("Pared oscura (suciedad)", Color) = (0.32, 0.34, 0.38, 1)
        _Roof ("Techo", Color) = (0.22, 0.23, 0.26, 1)
        _WindowColor ("Vidrio", Color) = (0.18, 0.32, 0.45, 1)
        _LitColor ("Luz encendida", Color) = (1.0, 0.85, 0.45, 1)
        _WinW ("Ancho ventana+pared", Range(0.8, 6)) = 2.2
        _WinH ("Alto de piso", Range(0.8, 6)) = 2.8
        _WinFill ("Tamano de ventana", Range(0.2, 0.9)) = 0.58
        _Night ("Noche (0 dia - 1 noche)", Range(0, 1)) = 0.0
        _LitChance ("Ventanas encendidas", Range(0, 1)) = 0.45
        _Seed ("Variacion por edificio", Float) = 0
    }
    SubShader
    {
        Tags { "RenderType"="Opaque" }
        CGPROGRAM
        #pragma surface surf Standard fullforwardshadows
        #pragma target 3.0
        #include "TrashManCommon.cginc"
        struct Input { float3 worldPos; float3 worldNormal; };
        fixed4 _Wall, _WallDark, _Roof, _WindowColor, _LitColor;
        float _WinW, _WinH, _WinFill, _Night, _LitChance, _Seed;

        void surf(Input IN, inout SurfaceOutputStandard o)
        {
            float3 n = normalize(IN.worldNormal);
            float3 wp = IN.worldPos;
            if (n.y > 0.7)                                   // techo
            {
                o.Albedo = _Roof.rgb * (0.85 + 0.3 * tm_vnoise(wp.xz * 3.0));
                o.Smoothness = 0.1; o.Metallic = 0;
                return;
            }
            float h = abs(n.x) > abs(n.z) ? wp.z : wp.x;
            float2 cell = floor(float2(h / _WinW, wp.y / _WinH));
            float2 f = frac(float2(h / _WinW, wp.y / _WinH));

            fixed3 wall = lerp(_Wall.rgb, _WallDark.rgb, tm_fbm(float2(h, wp.y) * 0.35 + _Seed) * 0.8);
            wall *= 0.92 + 0.16 * tm_vnoise(float2(h, wp.y) * 6.0);
            wall = lerp(wall, _WallDark.rgb, smoothstep(2.0, 0.0, wp.y) * 0.5);      // mugre abajo

            float2 m = abs(f - 0.5);
            float win = step(m.x, _WinFill * 0.5) * step(m.y, _WinFill * 0.5) * step(wp.y, 1000.0) * step(1.0, wp.y);
            float lit = step(1.0 - _LitChance, tm_hash21(cell + _Seed)) * _Night;
            float frame = win * smoothstep(0.0, 0.05, 0.5 * _WinFill - max(m.x, m.y));

            fixed3 glass = _WindowColor.rgb * (0.6 + 0.8 * f.y);
            o.Albedo = lerp(wall, glass, win);
            o.Emission = _LitColor.rgb * lit * win * 1.4;
            o.Smoothness = lerp(0.05, 0.85, win);
            o.Metallic = win * 0.2;
        }
        ENDCG
    }
    FallBack "Diffuse"
}
