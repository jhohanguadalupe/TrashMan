// CIUDAD - CALLE: asfalto con grano, grietas, manchas y lineas pintadas.
// Usa las UV del mesh: U = ancho de la calle (0..1), V = largo. Un Plane/Quad estirado funciona.
Shader "TrashMan/CityRoad"
{
    Properties
    {
        _Asphalt ("Asfalto", Color) = (0.16, 0.17, 0.19, 1)
        _AsphaltLight ("Asfalto claro", Color) = (0.27, 0.28, 0.30, 1)
        _LineColor ("Linea central", Color) = (0.98, 0.82, 0.20, 1)
        _EdgeColor ("Linea de borde", Color) = (0.92, 0.92, 0.92, 1)
        _Dashes ("Rayas por unidad de V", Range(1, 60)) = 12
        _Cracks ("Grietas", Range(0, 1)) = 0.4
        _Wet ("Mojado (charcos)", Range(0, 1)) = 0.0
        _Tile ("Escala del grano (mundo)", Range(0.2, 6)) = 1.5
    }
    SubShader
    {
        Tags { "RenderType"="Opaque" }
        CGPROGRAM
        #pragma surface surf Standard fullforwardshadows
        #pragma target 3.0
        #include "TrashManCommon.cginc"
        struct Input { float2 uv_MainTex; float3 worldPos; };
        sampler2D _MainTex;
        fixed4 _Asphalt, _AsphaltLight, _LineColor, _EdgeColor;
        float _Dashes, _Cracks, _Wet, _Tile;

        void surf(Input IN, inout SurfaceOutputStandard o)
        {
            float2 w = IN.worldPos.xz * _Tile;
            float grain = tm_vnoise(w * 9.0);
            float patch = tm_fbm(w * 0.6);
            fixed3 c = lerp(_Asphalt.rgb, _AsphaltLight.rgb, patch * 0.8 + (grain - 0.5) * 0.25);

            float3 v = tm_voronoi(w * 1.3);
            float crack = smoothstep(0.05, 0.0, v.y - v.x) * _Cracks * step(0.45, patch);
            c *= 1.0 - crack * 0.7;

            // lineas
            float u = IN.uv_MainTex.x, vv = IN.uv_MainTex.y;
            float center = smoothstep(0.015, 0.0, abs(u - 0.5)) * step(frac(vv * _Dashes), 0.55);
            float edge = smoothstep(0.012, 0.004, abs(u - 0.06)) + smoothstep(0.012, 0.004, abs(u - 0.94));
            float wear = 0.65 + 0.35 * tm_vnoise(w * 14.0);                 // pintura desgastada
            c = lerp(c, _LineColor.rgb, center * wear);
            c = lerp(c, _EdgeColor.rgb, saturate(edge) * wear);

            // charcos
            float puddle = smoothstep(0.55, 0.7, tm_fbm(w * 0.35 + 5.0)) * _Wet;
            c *= 1.0 - puddle * 0.5;
            o.Albedo = c;
            o.Smoothness = lerp(0.08, 0.9, puddle) + _Wet * 0.15;
            o.Metallic = 0;
        }
        ENDCG
    }
    FallBack "Diffuse"
}
