import type { Configuration, Compiler } from "webpack";
// eslint-disable-next-line import/default
import CopyWebpackPlugin from "copy-webpack-plugin";
import path from "path";
import { rules } from "./webpack.rules";
import chmodr from "chmodr";
import { promisify } from "util";

// https://github.com/webpack-contrib/copy-webpack-plugin/issues/35#issuecomment-1407280257
class PermissionsPlugin {
  apply(compiler: Compiler) {
    compiler.hooks.afterEmit.tap("PermissionsPlugin", async (c) => {
      await Promise.all(
        Object.keys(c.assets)
          .filter((f) => f.endsWith(".bin"))
          .map((binary) =>
            promisify(chmodr)(
              path.join(c.outputOptions.path ?? "", binary),
              0o755
            )
          )
      );
    });
  }
}

export const mainConfig: Configuration = {
  /**
   * This is the main entry point for your application, it's the first file
   * that runs in the main process.
   */
  entry: "./src/index.ts",
  // Put your normal webpack config below here
  module: {
    rules,
  },
  plugins: [
    new PermissionsPlugin(),
    new CopyWebpackPlugin({
      patterns: [
        path.resolve(__dirname, "src/assets/img/faviconTemplate.png"),
        path.resolve(__dirname, "src/assets/img/faviconTemplate@2x.png"),
        { from: path.resolve(__dirname, "../web/build"), to: "web" },
        { from: path.resolve(__dirname, "../mock/hello"), to: "signer.bin" },
      ],
    }),
  ],
  resolve: {
    extensions: [".js", ".ts", ".jsx", ".tsx", ".css", ".json"],
  },
};
