var tl;

var Timeline = function (data) {
	return {
		rawData: data,
		data: {
			projects: [],
		// these dates are for the whole timeline
			startDate: null,
			endDate: null,
			duration: null,
			durationHuman: null
		},

		config: {
			minCanvasWidth: $(window).width(),
			minMonthWidth: 30, //px
			minProjectWidth: 10, //px
			monthWidth: null, //px
			barHeight: null,
			barSpacing: 5,
			barStackHeight: 10,
			barColors: ['#49a7e9', '#49e9e7', '#8e62ff', '#62ff92'],
			barHoverColor: new fabric.Color('#d2ff00').setAlpha(.75)
		},

		canvas: null,

		init: function () {
			this.applySettings();
			this.initProjects();
			this.initCanvas();
			this.render();
		},

		initProjects: function () {
			$('#username').text(this.rawData.user.name + "'s ");
			_.each(this.rawData.projects, function(proj, i) {
				var start = moment(proj.started);
				var end = moment(proj.completed);
				var duration = null;

				proj.id = i;

				if (start !== null && end !== null) {

					// check if this project's completion date is the end of the timeline
					if (this.data.endDate < end)
						this.data.endDate = end;

					this.data.projects.push(new Project(start, end, proj));
				}
			}, this);

			// sort projects by start date
			this.data.projects = _.sortBy(this.data.projects, function (proj) {
				return proj.startDate.unix();
			});

			// set the whole timeline's start date
			this.data.startDate = moment(this.data.projects[0].startDate).subtract('months', 1);
			this.data.endDate = this.data.endDate.add('months', 1);

			// set the start date offset for each project
			_.each(this.data.projects, function (proj) {
				/* Calculate the number of months after the beginning of the timeline
				   that this project's start date occurs */
				proj.startOffset = this.calcMonthSpan(this.data.startDate, proj.startDate)
			}, this);
		},

		initCanvas: function() {
			var monthWidth;
			var canvasWidth;
			var windowHeight;
			var barHeight;

			this.canvas = new fabric.Canvas('c');
			this.canvas.selection = false;
			this.canvas.hoverCursor = 'pointer';

			/* Set the canvas height and set bar height so they fit */
			windowHeight = $(window).innerHeight() - $.scrollBarHeight();
			this.canvas.setHeight(windowHeight);
			barHeight = Math.floor((windowHeight - ((this.config.barStackHeight + 2) * this.config.barSpacing)) / (this.config.barStackHeight + 2));
			this.config.barHeight = barHeight;

			/* Determine the time span of the project data, which indicates how
			   wide the canvas should be */
			// add two extra months for whitespace on the left and right
			this.config.monthCount = this.calcMonthSpan(this.data.startDate,
				this.data.endDate) + 2;

			monthWidth = Math.floor(this.config.minCanvasWidth / this.config.monthCount);
			this.config.monthWidth = monthWidth < this.config.minMonthWidth ? this.config.minMonthWidth : monthWidth;

			canvasWidth = this.config.monthWidth * this.config.monthCount;
			canvasWidth = canvasWidth < this.config.minCanvasWidth ? this.config.minCanvasWidth : canvasWidth;
			this.canvas.setWidth(canvasWidth);
			$(window).width(canvasWidth);

			/* Hover events for project bars */
			this.canvas.on('object:over', function(e) {
				if (e.target.timelineObjectType === 'projectBar') {
					tl.onProjectBarMouseOver(e);
				}
			});

			this.canvas.on('object:out', function(e) {
				if (e.target.timelineObjectType === 'projectBar') {
					tl.onProjectBarMouseOut(e);
				}
			});

			/* This function is from the fabric.js demos:
				 http://fabricjs.com/hovering/ */
			this.canvas.findTarget = (function(originalFn) {
			  return function() {
			    var target = originalFn.apply(this, arguments);
			    if (target) {
			      if (this._hoveredTarget !== target) {
			        tl.canvas.fire('object:over', { target: target });
			        if (this._hoveredTarget) {
			          this.canvas.fire('object:out', { target: this._hoveredTarget });
			        }
			        this._hoveredTarget = target;
			      }
			    }
			    else if (this._hoveredTarget) {
			      tl.canvas.fire('object:out', { target: this._hoveredTarget });
			      this._hoveredTarget = null;
			    }
			    return target;
			  };
			})(this.canvas.findTarget);
		},

		applySettings: function () {
			var settings = $.queryString();

			if (settings.displayStyle === "heatmap") {
				this.config.barStackHeight = 1;
				this.config.barColors = ["#49a7e9"];
			}
		},

		render: function() {
			$('.main').html(ich.projectInfo(this.data));

			this.drawGrid();
			this.drawProjectBars();
			$('body').removeClass('loading');
		},

		onProjectBarMouseOver: function (e) {
			var bar = e.target;
			var arrowAdjust = -5; // px (to shift to make room for tooltip arrow)
			var infoBox;
			var boxX;
			var boxY;

		  bar.setFill(this.config.barHoverColor.toRgba());
		  bar.setStroke('#ccc');
		  this.canvas.renderAll();

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
		},

		onProjectBarMouseOut: function (e) {
			var bar = e.target;
		  bar.setFill(bar.timelineColor.toRgba());
		  bar.setStroke(null);
		  this.canvas.renderAll();

		  $('#project-'+bar.projectId).removeClass('active');
		},

		drawProjectBars: function() {
			_.each(this.data.projects, function(proj, i) {
				proj.drawBar(i % this.config.barStackHeight);
			}, this);
		},

		drawGrid: function() {
			var startMonth = this.data.startDate.month();
			var currentMonth;
			var currentYear = this.data.startDate.year();
			var line;
			var text;

			for (var i = 0; i <= this.config.monthCount; i++) {
				// draw darker lines for January
				currentMonth = (startMonth + i) % 12;
				var lineColor = currentMonth === 0 ? 'rgba(50, 50, 50, .5)' :
					'rgba(200, 200, 200, .5)';

				// month lines
				line = new fabric.Rect({
					top: this.canvas.height/2,
					left: i * this.config.monthWidth,
					height: this.canvas.height,
					width: 1,
					fill: lineColor
				});

				line.timelineObjectType = 'line';
				line.selectable = false;

				this.canvas.add(line);

				// year labels -- print only on January lines
				if (currentMonth === 0) {
					currentYear++;

					text = new fabric.Text(
						currentYear, {
							top: 60,
							left: (i * this.config.monthWidth),
							fontFamily: "Megalopolis",
							fontSize: 100,
							fill: 'rgba(50, 50, 50, .1)',
							textAlign: 'center'
					});

					text.timelineObjectType = 'label';
					text.selectable = false;

					this.canvas.add(text);
					text.setLeft(text.left + this.config.monthWidth * 6);

				}
			}
		},

		calcMonthSpan: function (begin, end) {
			var span = 0;
			if (end.year() === begin.year()) {
				span = end.month() - begin.month();
			} else {
				span += ((end.year() - begin.year() - 1) * 12);
				span += 11 - begin.month();
				span += end.month() + 1;
			}
			span += end.date()/end.daysInMonth()
			return span;
		}

	}
};

var Project = function (start, end, data) {
	var duration = moment.duration(end.diff(start));
	var durationHuman = duration ? duration.asMonths() : null;

	return {
		id: data.id,
		name: data.name,
		patternName: data.pattern ? data.pattern.name : null,
		url: data.url,

		imageThumb: data.thumbnail ? data.thumbnail.src : null,
		imageMed: data.thumbnail ? data.thumbnail.medium : null,

		startDate: start,
		startDateHuman: start ? start.format('LL') : null,
		startOffset: null,
		endDate: end,
		endDateHuman: end ? end.format('LL') : null,

		duration: duration,
		durationHuman: durationHuman,

		/*
		 * stackPosition is the zero-indexed timeline row the bar should be drawn in
		 * 0 is the top row
		 */
		drawBar: function (stackPosition) {
			var width = tl.config.monthWidth * this.duration.asMonths();
			var color = new fabric.Color(tl.config.barColors[this.id % tl.config.barColors.length]).setAlpha(.5);

			this.canvasObj = new fabric.Rect({
				top: (stackPosition * (tl.config.barHeight + tl.config.barSpacing)) +
						 tl.config.barSpacing + tl.config.barHeight*1.5,
				// offset one month length from the left edge
				left: (this.startOffset * tl.config.monthWidth) + (width/2),
				/* projects that were started and completed on the same day will have
					 a length of zero, so set a default width of 1-day-ish in that case */
				width: width < tl.config.minProjectWidth ?
								tl.config.minProjectWidth : width,
				height: tl.config.barHeight,
				fill: color.toRgba()
			});
			this.canvasObj.timelineColor = color;
			this.canvasObj.projectId = this.id;
			this.canvasObj.timelineObjectType = 'projectBar';
			this.canvasObj.hasControls = this.canvasObj.hasBorders = false;
			this.canvasObj.lockMovementX = this.canvasObj.lockMovementY = true;
			this.canvasObj.lockScalingX = this.canvasObj.lockScalingY = true;
			this.canvasObj.lockRotation = true;

			tl.canvas.add(this.canvasObj);
		}
	};
};





$(function() {
	var queryString = $.queryString();
	queryString.projectData = queryString.projectData || 'me';
	queryString.displayStyle = queryString.displayStyle || 'barGraph';

	$.getJSON('/ravelry/httpdocs/data/progress-'+queryString.projectData+'.json')
	 	.success(function(data) {
		tl = new Timeline(data);
		tl.init();
	});

	// update settings display
	$('[data-prop="displayStyle"][data-val="'+queryString.displayStyle+'"]',
		'.settings').addClass('selected');
	$('[data-prop="projectData"][data-val="'+queryString.projectData+'"]',
		'.settings').addClass('selected');

	$.each($('.changeSetting', 'header'), function() {
		var settings = $.queryString();
		settings[$(this).data('prop')] = $(this).data('val');
		$(this).attr('href', window.location.href.split("?")[0] + "?" + $.param(settings));
	});

	/* A hacky solution to redrawing the graph when the window is resized, but
	 * fabric.js doesn't seem to recalculate the hover targets correctly
	 * when only the project bars are redrawn
	 */
	$(window).smartresize(function() {
		if ($(window).height() != tl.canvas.height) {
			window.location.reload();
		}
	});

	// scroll horizontally instead of vertically with the mousewheel
	$("body").on('mousewheel', function (e, delta) {
      this.scrollLeft -= (delta * 30);
      e.preventDefault();
   });
});