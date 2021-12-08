#ifndef ENV_ATLAS
#define ENV_ATLAS
uniform sampler2D texture_envAtlas;
#endif

void addAmbient() {
    vec3 dir = cubeMapRotate(dNormalW) * vec3(-1.0, 1.0, 1.0);
    vec2 uv = mapUv(toSphericalUv(dir), vec4(256.0, 256.0, 64.0, 32.0) / 512.0);

    vec4 raw = texture2D(texture_envAtlas, uv);
    vec3 linear = $DECODE(raw);
    dDiffuseLight += processEnvironment(linear);
}
