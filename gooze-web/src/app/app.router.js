import createRouter from "router5";
import browserPlugin from "router5/plugins/browser";


const router = (
	createRouter([
    {name: "payment", path: "/payment", children: [
      {name: "report", path: "/report"}
		]},
    {name: "support", path: "/support"}
	], {
		defaultRoute: "payment.report"
	})
		.usePlugin(
			browserPlugin({
				useHash: true
			})
		)
);


router.start();

export default router;
