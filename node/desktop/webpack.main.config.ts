import type { Configuration } from "webpack";
// eslint-disable-next-line import/default
import CopyWebpackPlugin from "copy-webpack-plugin";
import path from "path";
import { rules } from "./webpack.rules";

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
    new CopyWebpackPlugin({
      patterns: [
        path.resolve(__dirname, "src/assets/img/faviconTemplate.png"),
        path.resolve(__dirname, "src/assets/img/faviconTemplate@2x.png"),
        { from: path.resolve(__dirname, "../web/build"), to: "web" },
      ],
    }),
  ],
  resolve: {
    extensions: [".js", ".ts", ".jsx", ".tsx", ".css", ".json"],
  },
};
