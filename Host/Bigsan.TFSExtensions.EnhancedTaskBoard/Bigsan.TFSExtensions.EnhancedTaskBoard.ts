/// <reference path="d.ts/TFS11.d.ts" />
declare var $;
declare var __uiCulture: string;

TFS.module("Bigsan.TFSExtensions.EnhancedTaskBoard", ["TFS.Host"], function () {

	function addCssRules() {
		var styleHtml = ['<style id="etb" type="text/css">',
						'.daysAgo { float: left; padding: 0 4px; color: white; background: darkgreen; }',
						'.daysAgo.recent { background: darkred; }',
						'.wiid { }',
						'</style>'].join("");
		$("head").append(styleHtml);
	}

	function addIdToAllWorkItems() {
		// there are 3 places to add id, PBI, PBI summary and Task Tile
		$(".tbTile, .taskboard-parent[id]").each((idx, el) => {
			var targets = $(el);
			if ($(el).is(".taskboard-parent")) {
				var summaryRow = $(el).closest(".taskboard-row").next();
				targets = targets.add(summaryRow);
			}
			if (targets.find(".witTitle .wiid").length == 0)
				targets.find(".witTitle").prepend("<strong class='wiid' /> - ");

			var id = el.id.match(/\d+$/)[0];
			targets.find(".witTitle .wiid").text(id);
		});
	}

	function addDaysAgoToWorkItem(id, daysAgo, changedDate) {
		var daysAgoDiv = $("<div class='daysAgo'>" + daysAgo + "d</div>")
			.attr("title", changedDate.toString());
		if (daysAgo < 2) daysAgoDiv.addClass("recent");

		$("#tile-" + id).find(".witExtra").prepend(daysAgoDiv);
		var row = $("#taskboard-table_p" + id);
		var summaryRow = row.closest(".taskboard-row").next();
		row.add(summaryRow).find(".witTitle").before(daysAgoDiv);
	}

	function getAllIds() {
		return $(".tbTile, .taskboard-parent[id]").map((idx, item) => { return item.id.match(/\d+$/)[0]; }).get();
	}

	function getWitQueryUrl(ids: string[]) {
		var collectionUrl = location.pathname.match(/\/tfs\/[^\/]+/i)[0]; // ex: "/tfs/DefaultCollection"
		var idsQuery = $.map(ids, (item, idx) => { return "ids=" + item; }).join("&");
		return collectionUrl + "/_api/_wit/workitems?__v=1&" + idsQuery;
	}

	function queryWorkItems(ids: string[], callback: (wit_array: any[]) => {}) {
		var queryUrl = getWitQueryUrl(ids);

		$.getJSON(queryUrl, function (d) {
			callback(d.__wrappedArray);
		});
	}

	addCssRules();
	addIdToAllWorkItems();

	queryWorkItems(getAllIds(), (workitems) => {
		var now = new Date();
		$.each(workitems, function (idx, item) {
			var tick = parseInt(item.fields["3"].match(/\d+/)[0], 10);
			var id = item.fields["-3"];
			var date = new Date(tick);
			var msecsAgo = now.getTime() - date.getTime();

			var daysAgo = Math.ceil(msecsAgo / 86400000);
			addDaysAgoToWorkItem(id, daysAgo, date);
		});
	});
});