var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
// var db = require('../mongoose/index');
var Application = require('../models/application');

var Promise = require('bluebird'); // Import promise engine
mongoose.Promise = require('bluebird'); // Tell mongoose we are using the Bluebird promise library
Promise.promisifyAll(mongoose); // Convert mongoose API to always return promises using Bluebird's promisifyAll

// Helper query functions
var helpers = require('../mongoose/read-helpers');

//Need ObjectID to search by ObjectID
var ObjectId = require('mongodb').ObjectID;

router.get('/', function(req, res) {

    Promise.props({
        new: Application.find({status: "New"}).lean().execAsync(),
        processing: Application.find({$nor:[{ status: "New"}, {status: "Declined"}] }).lean().execAsync(),
        declined: Application.find({status: "Declined"}).lean().execAsync()
    })
        .then(function(results) {
            res.render('vetting', results);
        })
        .catch(function(err) {
            console.error(err);
        });

});

/* Route to specific application */
router.get('/:id', function(req, res) {
    //Checking what's in params
    console.log("Rendering application " + ObjectId(req.params.id));

    /* search by _id. Maybe we can do regular ID but currently
        it's not unique */
    Promise.props({
        application: Application.find({_id: ObjectId(req.params.id)}).lean().execAsync()
    })
        .then(function(result) {
            console.log(result.application[0]);
            //Is this how to send just the object rather than an array?
            res.render('view', result.application[0]);
        })
        .catch(function(err) {
            console.error(err);
        });

});

module.exports = router;
