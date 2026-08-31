const SOFTWARE_RENDERER_PATTERN = /swiftshader|software|llvmpipe|softpipe|mesa offscreen/i;

export function isSoftwareWebGlRenderer(renderer: unknown) {
  return typeof renderer === "string" && SOFTWARE_RENDERER_PATTERN.test(renderer);
}

export function supportsWebGl() {
  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    if (!context) return false;
    context.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}

export function supportsHardwareAcceleratedWebGl() {
  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    if (!context) return false;

    const rendererInfo = context.getExtension("WEBGL_debug_renderer_info");
    const renderer = rendererInfo
      ? context.getParameter(rendererInfo.UNMASKED_RENDERER_WEBGL)
      : null;
    const accelerated = !isSoftwareWebGlRenderer(renderer);

    context.getExtension("WEBGL_lose_context")?.loseContext();
    return accelerated;
  } catch {
    return false;
  }
}
