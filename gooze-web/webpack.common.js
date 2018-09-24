/* eslint-env node */
// noinspection NodeJsCodingAssistanceForCoreModules
const {join} = require("path");
const webpack = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const ExtractTextPlugin = require("extract-text-webpack-plugin");


module.exports = {
	entry: {
		"polyfills": "./src/polyfills.js",
		"vendor": "./src/vendor.js",
		"app": "./src/main.js"
	},

	resolve: {
		alias: {
			app: join(__dirname, "src/app"),
			utils: join(__dirname, "src/utils")
		},
		extensions: [".js"]
	},

	module: {
		rules: [{
			test: /\.js$/,
			exclude: /node_modules/,
			use: {
				loader: "babel-loader",
				options: {
					presets: [
                        "env",
                        "react"
                    ],
                    plugins: [
                        "transform-object-rest-spread"
                    ]
				}
			}
		}, {
			test: /\.scss$/,
			use: ExtractTextPlugin.extract({
				fallback: "style-loader",
				use: [{
					loader: "css-loader",
					options: {
						sourceMap: true
					}
				}, {
					loader: "sass-loader",
					options: {
						sourceMap: true,
						includePaths: ["node_modules/compass-mixins/lib"]
					}
				}]
			})
		}, {
			test: /\.html$/,
			loader: "html-loader"
		}, {
			test: /\.(png|jpe?g|gif|svg|woff|woff2|ttf|eot|ico)$/,
			loader: "file-loader?name=assets/[name].[hash].[ext]"

		}]
	},

	plugins: [

		new webpack.optimize.CommonsChunkPlugin({
			name: ["app", "vendor", "polyfills"]
		}),

		new HtmlWebpackPlugin({
			template: "src/index.html"
		})
	]
};


