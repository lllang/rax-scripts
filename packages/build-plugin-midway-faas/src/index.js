const path = require('path');
const fse = require('fs-extra');
const { useExpressDevPack } = require('@midwayjs/faas-dev-pack');

module.exports = async({
  context,
  onGetWebpackConfig
}) => {
  const { rootDir, command, userConfig } = context;

  const hasAPI = fse.existsSync(path.join(rootDir, 'src/apis'));

  // Compatible with build-plugin-rax-ssr
  const target = process.env.RAX_SSR || userConfig.web && userConfig.web.ssr ? 'ssr' : 'web';

  // Register FaaS Dev Server for API
  onGetWebpackConfig(target, (config) => {
    if (command === 'start' && hasAPI) {
      config.devServer.set('writeToDisk', true);

      const originalDevServeBefore = config.devServer.get('before');

      config.merge({
        devServer: {
          before(app, server) {
            if (typeof originalDevServeBefore === 'function') {
              originalDevServeBefore(app, server);
            }

            app.use(
              useExpressDevPack({
                functionDir: rootDir,
                sourceDir: 'src/apis',
              })
            );
          },
        },
      });
    }
  });
};
