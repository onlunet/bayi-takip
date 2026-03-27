let handlerModulePromise;

module.exports = async (req, res) => {
  if (!handlerModulePromise) {
    handlerModulePromise = import("../apps/api/dist/index.js");
  }

  const mod = await handlerModulePromise;
  return mod.default(req, res);
};
