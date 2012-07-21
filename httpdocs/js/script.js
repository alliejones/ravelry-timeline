var tl;
var Timeline = function (data) {
	var self = this;

	self.rawData = data;
	self.data = {};
	self.data.projects = [];

	// these dates are for the whole timeline
	self.data.startDate = null;
	self.data.endDate = null;
	self.data.duration = null;
	self.data.durationHuman = null;

	self.config = {};
	self.config.minCanvasWidth = $(window).width();
	self.config.minMonthWidth = 30; //px
	self.config.monthWidth = null; //px
	self.config.barHeight = 50;
	self.config.barSpacing = 5;
	self.config.barStackHeight = 10;

	self.canvas = null;

	self.init = function() {
		self.initProjects();
		self.initCanvas();
		self.render();
	};

	self.initProjects = function () {
		_.each(self.rawData.projects, function(proj) {
			var start = moment(proj.started);
			var end = moment(proj.completed);
			var duration = null;

			if (start !== null && end !== null) {
				duration = moment.duration(end.diff(start));

				// check if this project's completion date is the end of the timeline
				if (self.data.endDate < end)
					self.data.endDate = end;

				self.data.projects.push({
					name: proj.name,
					patternName: proj.pattern ? proj.pattern.name : null,
					imageThumb: proj.thumbnail ? proj.thumbnail.src : null,
					imageMed: proj.thumbnail ? proj.thumbnail.medium : null,
					startDate: start,
					startDateHuman: start ? start.format('LL') : null,
					endDate: end,
					duration: duration,
					durationHuman: duration ? duration.asMonths() : null
				});
			}
		});

		// sort projects by start date
		self.data.projects = _.sortBy(self.data.projects, function (proj) {
			return proj.startDate.unix();
		});

		// set the whole timeline's start date and duration
		self.data.startDate = self.data.projects[0].startDate;
		self.data.duration = moment.duration(self.data.endDate.diff(self.data.startDate));
		self.data.durationHuman = self.data.duration.humanize();

		// set the start date offset for each project
		_.each(self.data.projects, function (proj) {
			proj.startOffset = moment.duration(proj.startDate.diff(self.data.startDate));
			proj.startOffsetHuman = moment.duration(proj.startDate.diff(self.data.startDate)).asMonths();
		});
	};

	self.initCanvas = function() {
		var monthWidth;
		var canvasWidth;

		self.canvas = new fabric.StaticCanvas('c');
		self.canvas.setHeight(
			(self.config.barStackHeight + 2) *
			(self.config.barHeight + self.config.barSpacing)
		);

		// add two extra months for whitespace
		self.config.monthCount = Math.ceil(self.data.duration.asMonths()) + 2;

		monthWidth = Math.floor(self.config.minCanvasWidth / self.config.monthCount);
		self.config.monthWidth = monthWidth < self.config.minMonthWidth ? self.config.minMonthWidth : monthWidth;

		canvasWidth = self.config.monthWidth * self.config.monthCount;
		canvasWidth = canvasWidth < self.config.minCanvasWidth ? self.config.minCanvasWidth : canvasWidth;
		self.canvas.setWidth(canvasWidth);
	};

	self.render = function() {
		//$('.main').html(ich.timeline(self.data));

		// draw month lines
		for (var i = 0; i <= self.config.monthCount; i++) {
			self.canvas.add(new fabric.Rect({
				top: self.canvas.height/2,
				left: i * self.config.monthWidth,
				height: self.canvas.height,
				width: 1,
				fill: 'rgba(200,200,200,.5)'
			}));
		}

		_.each(self.data.projects, function(proj, i) {
			var width = self.config.monthWidth * proj.duration.asMonths();

			self.canvas.add(new fabric.Rect({
				top: (self.config.barHeight * 1.2 * (i % self.config.barStackHeight)) + (self.config.barHeight * 1.2),
				// offset one month length from the left edge
				left: ((proj.startOffset.asMonths() + 1) * self.config.monthWidth) + (width/2),
				/* projects that were started and completed on the same day will have
					 a length of zero, so set a default width of 1-day-ish in that case */ 
				width: width || self.config.monthWidth/30,
				height: self.config.barHeight,
				fill: 'rgba(124,145,222,.75)'
			}));
		});
	};

};

Timeline.createTimeline = function (data) {
	tl = new Timeline(data);
	tl.init();
};

$(function() {
	$.getJSON('/ravelry/httpdocs/data/progress-soph.json').success(Timeline.createTimeline);
});