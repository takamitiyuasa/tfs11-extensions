TFS.module("Bigsan.TFSExtensions.EnhancedTaskBoard", [
    "TFS.Host"
], function () {
    function addCssRules() {
        var styleHtml = [
            '<style id="etb" type="text/css">', 
            '.daysAgo { float: left; padding: 0 4px; color: white; background: darkgreen; }', 
            '.daysAgo.recent { background: darkred; }', 
            '.wiid { }', 
            '</style>'
        ].join("");
        $("head").append(styleHtml);
    }
    function addIdToWorkItem(id) {
        var tile = $("#tile-" + id);
        var pbi = $("#taskboard-table_p" + id);
        var pbi_summary = pbi.closest(".taskboard-row").next();
        tile.add(pbi).add(pbi_summary).each(function (idx, el) {
            if($(el).find(".wiid").length == 0) {
                $(el).find(".witTitle").prepend("<strong class='wiid' /> -");
            }
            $(el).find(".witTitle .wiid").text(id);
        });
    }
    function addIdToWorkItems(ids) {
        $.each(ids, function (idx, item) {
            addIdToWorkItem(item);
        });
    }
    function addDaysAgoToWorkItem(id, changedDate) {
        var msecsAgo = (new Date()).getTime() - changedDate.getTime();
        var daysAgo = Math.ceil(msecsAgo / 86400000);
        var daysAgoDiv = $("<div class='daysAgo'>" + daysAgo + "d</div>").attr("title", changedDate.toString());
        if(daysAgo < 2) {
            daysAgoDiv.addClass("recent");
        }
        $("#tile-" + id).find(".witExtra").prepend(daysAgoDiv);
        var row = $("#taskboard-table_p" + id);
        var summaryRow = row.closest(".taskboard-row").next();
        row.add(summaryRow).find(".witTitle").prevAll().remove().end().before(daysAgoDiv);
    }
    function getAllIds() {
        return $(".tbTile, .taskboard-parent[id]").map(function (idx, item) {
            return item.id.match(/\d+$/)[0];
        }).get();
    }
    function getWitQueryUrl(ids) {
        var collectionUrl = location.pathname.match(/\/tfs\/[^\/]+/i)[0];
        var idsQuery = $.map(ids, function (item, idx) {
            return "ids=" + item;
        }).join("&");
        return collectionUrl + "/_api/_wit/workitems?__v=1&" + idsQuery;
    }
    function queryWorkItems(ids, callback) {
        var queryUrl = getWitQueryUrl(ids);
        $.getJSON(queryUrl, function (d) {
            callback(d.__wrappedArray);
        });
    }
    var ids = getAllIds();
    queryWorkItems(ids, function (workitems) {
        var now = new Date();
        $.each(workitems, function (idx, item) {
            var id = item.fields["-3"];
            var tick = parseInt(item.fields["3"].match(/\d+/)[0], 10);
            var date = new Date(tick);
            addDaysAgoToWorkItem(id, date);
        });
    });
    addCssRules();
    addIdToWorkItems(ids);
    var wiManager = TFS.OM.TfsTeamProjectCollection.getDefault().getService(TFS.WorkItemTracking.WorkItemStore).workItemManager;
    wiManager.attachWorkItemChanged(function (sender, ea) {
        if(ea.change == "reset" || ea.change == "save-completed") {
            var wi = ea.workItem;
            var id = wi.getFieldValue("System.Id");
            var changedDate = wi.getFieldValue("System.ChangedDate").value;
            window.setTimeout(function () {
                addIdToWorkItem(id);
                addDaysAgoToWorkItem(id, changedDate);
            }, 500);
        }
    });
});