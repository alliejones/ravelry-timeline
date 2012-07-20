var tl;
var Timeline = function (data) {
	var self = this;

	self.rawData = data;
	self.data = {};
	self.data.projects = [];

	self.init = function() {
		self.initProjects();
		self.render();
	};

	self.initProjects = function () {
		_.each(self.rawData.projects, function(proj) {
			var start = moment(proj.started);
			var end = moment(proj.completed);
			var duration = null;

			if (start !== null && end !== null) {
				duration = moment.duration(end.diff(start));

				self.data.projects.push({
					name: proj.name,
					patternName: proj.pattern ? proj.pattern.name : null,
					imageThumb: proj.thumbnail ? proj.thumbnail.src : null,
					imageMed: proj.thumbnail ? proj.thumbnail.medium : null,
					startDate: start,
					startDateHuman: start ? start.format('LL') : null,
					endDate: end,
					duration: duration,
					durationHuman: duration ? duration.humanize() : null
				});
			}
		});

		// sort projects by start date
		self.data.projects = _.sortBy(self.data.projects, function (proj) {
			return proj.startDate.unix();
		});
	};

	self.render = function() {
		$('.main').html(ich.timeline(self.data));
	};
};

Timeline.createTimeline = function (data) {
	tl = new Timeline(data);
	tl.init();
};

$(function() {
	$.getJSON('/ravelry/httpdocs/data/progress-soph.json').success(Timeline.createTimeline);
});