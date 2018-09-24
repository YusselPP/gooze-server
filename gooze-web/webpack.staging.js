/* eslint-env node */
// noinspection NodeJsCodingAssistanceForCoreModules
const {join} = require("path");
const webpack = require("webpack");
const webpackMerge = require("webpack-merge");
const ExtractTextPlugin = require("extract-text-webpack-plugin");
const commonConfig = require("./webpack.common.js");

const ENV = process.env.NODE_ENV = process.env.ENV = "staging";

module.exports = webpackMerge(commonConfig, {

	devtool: "cheap-module-eval-source-map",

	output: {
		path: join(__dirname, "dist"),
		publicPath: "/staging/admin/",
		filename: "[name].js",
		chunkFilename: "[id].chunk.js"
	},

	plugins: [
		new ExtractTextPlugin("[name].css"),
        new webpack.DefinePlugin({
            "process.env": {
                "ENV": JSON.stringify(ENV),
                "NODE_ENV": JSON.stringify(ENV)
            }
        })
	],

	watchOptions: {
		aggregateTimeout: 300,
		ignored: [
			/node_modules/,
			/dist/,
			/docs/
		]
	},

	devServer: {
		historyApiFallback: true,
		stats: "minimal"
	}
});
