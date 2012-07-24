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
	self.config.minProjectWidth = 10; //px
	self.config.monthWidth = null; //px
	self.config.barHeight = null;
	self.config.barSpacing = 5;
	self.config.barStackHeight = 10;
	self.config.barColors = ['#49a7e9', '#49e9e7', '#8e62ff', '#62ff92'];
	self.config.barHoverColor = new fabric.Color('#d2ff00').setAlpha(.75);

	self.canvas = null;

	self.Project = function (start, end, data) {
		this.id = data.id;
		this.name = data.name;
		this.patternName = data.pattern ? data.pattern.name : null;
		this.url = data.url;

		this.imageThumb = data.thumbnail ? data.thumbnail.src : null;
		this.imageMed = data.thumbnail ? data.thumbnail.medium : null;
		
		this.startDate = start;
		this.startDateHuman = start ? start.format('LL') : null;
		this.startOffset = null;
		this.endDate = end;
		this.endDateHuman = end ? end.format('LL') : null;
		
		this.duration = moment.duration(end.diff(start));
		this.durationHuman = this.duration ? this.duration.asMonths() : null;
	};

	/*
	   stackPosition is the zero-indexed timeline row the bar should be drawn in
		 0 is the top row
	*/
	self.Project.prototype.drawBar = function (stackPosition) {
		var width = self.config.monthWidth * this.duration.asMonths();
		var color = new fabric.Color(self.config.barColors[this.id % self.config.barColors.length]).setAlpha(.5);

		this.canvasObj = new fabric.Rect({
			top: (stackPosition * (self.config.barHeight + self.config.barSpacing)) +
					 self.config.barSpacing + self.config.barHeight*1.5,
			// offset one month length from the left edge
			left: ((this.startOffset.asMonths() + 1) * self.config.monthWidth) + (width/2),
			/* projects that were started and completed on the same day will have
				 a length of zero, so set a default width of 1-day-ish in that case */ 
			width: width < self.config.minProjectWidth ?
							self.config.minProjectWidth : width,
			height: self.config.barHeight,
			fill: color.toRgba()
		});
		this.canvasObj.timelineColor = color;
		this.canvasObj.projectId = this.id;
		this.canvasObj.timelineObjectType = 'projectBar';
		this.canvasObj.hasControls = this.canvasObj.hasBorders = false;
		this.canvasObj.lockMovementX = this.canvasObj.lockMovementY = true;
		this.canvasObj.lockScalingX = this.canvasObj.lockScalingY = true;
		this.canvasObj.lockRotation = true;

		self.canvas.add(this.canvasObj);
	}

	self.init = function () {
		self.initProjects();
		self.initCanvas();
		self.render();
	};

	self.initProjects = function () {
		$('#username').text(self.rawData.user.name + "'s ");
		_.each(self.rawData.projects, function(proj, i) {
			var start = moment(proj.started);
			var end = moment(proj.completed);
			var duration = null;

			proj.id = i;

			if (start !== null && end !== null) {

				// check if this project's completion date is the end of the timeline
				if (self.data.endDate < end)
					self.data.endDate = end;

				self.data.projects.push(new self.Project(start, end, proj));
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
		var windowHeight;
		var barHeight;

		self.canvas = new fabric.Canvas('c');
		self.canvas.selection = false;
		self.canvas.hoverCursor = 'pointer';

		/* Set the canvas height and set bar height so they fit */
		windowHeight = $(window).height();
		self.canvas.setHeight(windowHeight);
		barHeight = Math.floor((windowHeight - ((self.config.barStackHeight + 2) * self.config.barSpacing)) / (self.config.barStackHeight + 2));
		self.config.barHeight = barHeight;

		/* Determine the time span of the project data, which indicates how
		   wide the canvas should be */
		// add two extra months for whitespace on the left and right
		self.config.monthCount = Math.ceil(self.data.duration.asMonths()) + 2;

		monthWidth = Math.floor(self.config.minCanvasWidth / self.config.monthCount);
		self.config.monthWidth = monthWidth < self.config.minMonthWidth ? self.config.minMonthWidth : monthWidth;

		canvasWidth = self.config.monthWidth * self.config.monthCount;
		canvasWidth = canvasWidth < self.config.minCanvasWidth ? self.config.minCanvasWidth : canvasWidth;
		self.canvas.setWidth(canvasWidth);
		$(window).width(canvasWidth);

		/* Hover events for project bars */
		self.canvas.on('object:over', function(e) {
			if (e.target.timelineObjectType === 'projectBar') {
				self.onProjectBarMouseOver(e);
			}
		});

		self.canvas.on('object:out', function(e) {
			if (e.target.timelineObjectType === 'projectBar') {
				self.onProjectBarMouseOut(e);
			}
		});

		/* This function is from the fabric.js demos:
			 http://fabricjs.com/hovering/ */
		self.canvas.findTarget = (function(originalFn) {
		  return function() {
		    var target = originalFn.apply(this, arguments);
		    if (target) {
		      if (this._hoveredTarget !== target) {
		        self.canvas.fire('object:over', { target: target });
		        if (this._hoveredTarget) {
		          self.canvas.fire('object:out', { target: this._hoveredTarget });
		        }
		        this._hoveredTarget = target;
		      }
		    }
		    else if (this._hoveredTarget) {
		      self.canvas.fire('object:out', { target: this._hoveredTarget });
		      this._hoveredTarget = null;
		    }
		    return target;
		  };
		})(self.canvas.findTarget);
	};

	self.onProjectBarMouseOver = function (e) {
		var bar = e.target;
		var arrowAdjust = -5; // px (to shift to make room for tooltip arrow)
		var infoBox;
		var boxX;
		var boxY;

	  bar.setFill(self.config.barHoverColor.toRgba());
	  bar.setStroke('#ccc');
	  self.canvas.renderAll();

	  infoBox = $('#project-'+bar.projectId).addClass('active');
	  boxX = bar.left - (infoBox.outerWidth()/2);
	  boxY = bar.top + (bar.height/2) + arrowAdjust;

	  // if bottom of info box is offscreen, display above bar instead
	  if (boxY + infoBox.outerHeight() > $(window).height()) {
	  	boxY = bar.top - bar.height/2 - infoBox.outerHeight();
	  	$('.tooltip', infoBox).addClass('arrowBottom');
	  }

	  // adjust left edge of info box if it is offscreen
	  if (boxX - $(window).scrollLeft() < 0) {
	  	boxX = $(window).scrollLeft() + 10;
	  // adjust right edge of info box if it is offscreen
	  } else if (boxX + infoBox.outerWidth() - $(window).scrollLeft() >
	  					 $(window).width()) {
	  	boxX = $(window).scrollLeft() + $(window).width() - infoBox.outerWidth() - 10;
	  }

	  infoBox.css({ left: boxX, top: boxY });
	};

	self.onProjectBarMouseOut = function (e) {
		var bar = e.target;
	  bar.setFill(bar.timelineColor.toRgba());
	  bar.setStroke(null);
	  self.canvas.renderAll();

	  $('#project-'+bar.projectId).removeClass('active');
	};

	self.render = function() {
		$('.main').html(ich.projectInfo(self.data));

		self.drawGrid();
		self.drawProjectBars();
		$('body').removeClass('loading');
	};

	self.drawProjectBars = function() {
		_.each(self.data.projects, function(proj, i) {
			proj.drawBar(i % self.config.barStackHeight);
		});
	};

	self.drawGrid = function() {
		var startMonth = self.data.startDate.month();
		var currentMonth;
		var currentYear = self.data.startDate.year();
		var line;
		var text;

		for (var i = 0; i <= self.config.monthCount; i++) {
			// draw darker lines for January
			var lineColor = currentMonth === 1 ? 'rgba(50, 50, 50, .5)' :
				'rgba(200, 200, 200, .5)';
			currentMonth = (startMonth + (i + 1)) % 12;

			// month lines
			line = new fabric.Rect({
				top: self.canvas.height/2,
				left: i * self.config.monthWidth,
				height: self.canvas.height,
				width: 1,
				fill: lineColor
			});

			line.timelineObjectType = 'line';
			line.selectable = false;

			self.canvas.add(line);

			// year labels -- print only on January lines
			if (currentMonth === 1) {
				text = new fabric.Text(
					currentYear, {
						top: 60,
						left: (i * self.config.monthWidth) + self.config.monthWidth,
						fontFamily: "Megalopolis",
						fontSize: 100,
						fill: 'rgba(50, 50, 50, .1)',
						textAlign: 'center'
				});

				text.timelineObjectType = 'label';
				text.selectable = false;

				self.canvas.add(text);
				text.setLeft(text.left + self.config.monthWidth * 6);

				currentYear++;
			}
		}
	};


};

$(function() {
	$.getJSON('/ravelry/httpdocs/data/progress-soph.json').success(function(data) {
		tl = new Timeline(data);
		tl.init();
	});

	// scroll horizontally instead of vertically with the mousewheel
	$("body").on('mousewheel', function (e, delta) {
      this.scrollLeft -= (delta * 30);
      e.preventDefault();
   });
});