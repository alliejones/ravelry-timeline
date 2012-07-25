# Ravelry Timeline
Ravelry Timeline generates a pretty graphical timeline of your Ravelry
knitting projects.

## How To Try It
You can [check it out on Github pages](http://alliejones.github.com/ravelry-timeline/httpdocs/). It isn't hooked up to the Ravelry API (yet, hopefully!), but
you can see how it works with sample data.

## Technical Info
The timeline is written completely in javascript, using
[fabric.js](http://fabricjs.com/) and HTML5 canvas (as well as jQuery and Underscore).

Since it uses canvas, it doesn't work in browsers that don't support the `<canvas>`
element (any version of Internet Explorer older than IE9).

## Next Steps and Possible Improvements
* Hook it up to the API so any Ravelry user could generate a project timeline. (I'd
definitely like to do this one.)

* Give the project bars meaningful color coding--possibly by tag or pattern 
category (not sure since I don't know how those are structured).

* Performance improvements -- I'm not very familiar with fabric.js or using canvas,
so I'm sure there's plenty of room to be more efficient.