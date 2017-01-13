var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var db = require('../mongoose/connection');
var DocumentPackage = require('../models/documentPackage');
var HighlightPackage = require('../models/highlightPackage');
var VettingNotePackage = require('../models/vettingNotePackage');
var api = require('../controllers/api');

var Promise = require('bluebird'); // Import promise engine
mongoose.Promise = require('bluebird'); // Tell mongoose we are using the Bluebird promise library
Promise.promisifyAll(mongoose); // Convert mongoose API to always return promises using Bluebird's promisifyAll

// Helper query functions

//Need ObjectID to search by ObjectID
var ObjectId = require('mongodb').ObjectID;


/**
 * This Router handles GET Requests for viewing the vetting home page and specific application pages
 *
 * It also handles the POST requests for adding/updating vetting notes
 *
 * Status codes from models/DocumentPackage.js
     Codes needed are:
     Code - description
     new - new document package, has yet to be reviewed
     phone - document package has been seen, internal agent needs to contact client and verify document package information
     documents - additional documents are needed from the client before document package can proceed
     discuss - internal discussion needs to take place to determine if the document package is approved, denied, handle-it, or other
     visit - a member of catalyst must visit the property to determine the extent of repairs needed
     approval - awaiting the green light to go ahead as a project
     handle - the document package is forwarded to the handle-it team to be completed
     declined - the document package was declined for various reasons
     project - the project has been approved and the document package will be converted to a project package
 **/

router.get('/', api.getDocumentByStatus, function(req, res, next) {

    var payload = {};

    if (res.locals.results.new[0] == null) {
        console.log('[ ROUTER ] /view/status :: Unable to find Document Packages with status: \'new\'');
    } else {
        res.locals.results.new.forEach(function (element) {
            element = formatElement(element);
        });
    }
    payload.new = res.locals.results.new;

    //put declined and withdrawn in the same bucket
    payload.unapproved = [];

    if (res.locals.results.declined[0] == null) {
        console.log('[ ROUTER ] /view/status :: Unable to find Document Packages with status: \'declined\'');
    } else {
        res.locals.results.declined.forEach(function (element) {
            element = formatElement(element);
            payload.unapproved.push(element);
        });
    }

    if (res.locals.results.withdrawn[0] == null) {
        console.log('[ ROUTER ] /view/status :: Unable to find Document Packages with status: \'withdrawn\'');
    } else {
        res.locals.results.withdrawn.forEach(function (element) {
            element = formatElement(element);
            payload.unapproved.push(element);
        });
    }

    //add all other existing statuses to processing array
    payload.processing = [];

    if (res.locals.results.phone[0] == null) {
        console.log('[ ROUTER ] /view/status :: Unable to find Document Packages with status: \'phone\'');
    } else {
        //need to grab each element and push into the 'processing' array
        res.locals.results.phone.forEach(function (element) {
            element = formatElement(element);
            payload.processing.push(element);
        });
    }

    if (res.locals.results.handle[0] == null) {
        console.log('[ ROUTER ] /view/status :: Unable to find Document Packages with status: \'handle\'');
    } else {
        res.locals.results.handle.forEach(function (element) {
            element = formatElement(element);
            payload.processing.push(element);
        });
    }

    if (res.locals.results.documents[0] == null) {
        console.log('[ ROUTER ] /view/status :: Unable to find Document Packages with status: \'documents\'');
    } else {
        res.locals.results.documents.forEach(function (element) {
            element = formatElement(element);
            payload.processing.push(element);
        });
    }

    if (res.locals.results.discuss[0] == null) {
        console.log('[ ROUTER ] /view/status :: Unable to find Document Packages with status: \'discuss\'');
    } else {
        res.locals.results.discuss.forEach(function (element) {
            element = formatElement(element);
            payload.processing.push(element);
        });
    }

    if (res.locals.results.assess[0] == null) {
        console.log('[ ROUTER ] /view/status :: Unable to find Document Packages with status: \'assess\'');
    } else {
        res.locals.results.assess.forEach(function (element) {
            element = formatElement(element);
            payload.processing.push(element);
        });
    }

    if (res.locals.results.approval[0] == null) {
        console.log('[ ROUTER ] /view/status :: Unable to find Document Packages with status: \'approval\'');
    } else {
        res.locals.results.approval.forEach(function (element) {
            element = formatElement(element);
            payload.processing.push(element);
        });
    }


    if (res.locals.results.project[0] == null) {
        console.log('[ ROUTER ] /view/status :: Unable to find Document Packages with status: \'project\'');
    } else {
        res.locals.results.project.forEach(function (element) {
            element = formatElement(element);
            payload.processing.push(element);
        });
    }

    res.render('vetting', payload);
});

/**
 * Route for adding notes
**/
router.post('/addNote', api.postVettingNote, function(req, res, next) {
    if(res.locals.status != '200'){
        res.status(500).send("Could not add note");
    }
    else{
        res.status(200).send({ status: 'success' });
    }
});

/**
 * Route for deleting notes
 **/
router.post('/delNote', api.removeVettingNote, function(req, res, next) {
    if(res.locals.status != '200'){
        res.status(500).send("Could not delete note");
    }
    else{
        res.status(200).send({ status: '200'});
    }
});

/**
 * Route for updating notes
 **/
router.post('/updateNote', api.updateVettingNote, function(req, res, next) {
    if(res.locals.status != '200'){
        res.status(500).send("Could not update note");
    }
    else{
        res.status(200).send({ status: '200'});
    }
});

/* Route to specific application by DocumentPackage Object ID */
router.get('/:id', function(req, res, next) {
    //Checking what's in params
    console.log("Rendering application " + ObjectId(req.params.id));

    /* search by _id. */
    Promise.props({
        highlight: HighlightPackage.findOne({ 'documentPackage' : ObjectId(req.params.id)}).lean().execAsync(),
        doc: DocumentPackage.findOne({_id: ObjectId(req.params.id)}).lean().execAsync(),
        vettingNotes: VettingNotePackage.find({applicationId: ObjectId(req.params.id)}).lean().execAsync()
    })
    .then(function(results) {
        // format birth date for display
        if (results.doc.application.dob.date != null) {
            var dobYear = results.doc.application.dob.date.getFullYear();
            //get month and day with padding since they are 0 indexed
            var dobDay = ( "00" + results.doc.application.dob.date.getDate()).slice(-2);
            var dobMon = ("00" + (results.doc.application.dob.date.getMonth()+1)).slice(-2);
            results.doc.application.dob.date = dobYear + "-" + dobMon + "-" + dobDay;
        }
        // format vetting notes dates
        if(results.vettingNotes.length != 0)
        {
            results.vettingNotes.forEach(function(note, index){
                var Year = note.date.getFullYear();
                //get month and day with padding since they are 0 indexed
                var Day = ( "00" + note.date.getDate()).slice(-2);
                var Mon = ("00" + (note.date.getMonth()+1)).slice(-2);
                results.vettingNotes[index].date = Mon + "/" + Day + "/" + Year;
            });
        }

        res.locals.layout = 'b3-layout';        // Change default from layout.hbs to b3-layout.hbs

        results.title = "Application View";     //Page <title> in header

        res.render('b3-view', results);
    })
    .catch(function(err) {
        console.error(err);
        res.render('error', {message: err.message, error: err})
    });

});

function formatElement(element) {
    formatStatus(element);
    formatDate(element);
    return element;
}

/**
 * Takes the VERY long date in the DB and makes it into a nicer format
 * @param element (the document package)
 * @returns: The document package with formatted date
 */
function formatDate(element)
{
    var Year = element.updated.getFullYear();
    //get month and day with padding since they are 0 indexed
    var Day = ( "00" + element.updated.getDate()).slice(-2);
    var Mon = ("00" + (element.updated.getMonth()+1)).slice(-2);
    element.updated = Mon + "/" + Day + "/" + Year;
    return element;
}

/**
 * Takes the status string from the DB and makes it more detailed for the front end
 * @param element (the document package)
 * @returns: The document package with wordier status
 */
function formatStatus(element) {
    var status;

    switch (element.status){
        case 'new':
            status = 'NEW';
            break;
        case 'phone':
            status = 'Phone Call Needed';
            break;
        case 'handle':
            status = 'Handle-It';
            break;
        case 'documents':
            status = 'Awaiting Documents';
            break;
        case 'discuss':
            status = 'On Hold - Pending Discussion';
            break;
        case 'assess':
            status = 'Site Assessment';
            break;
        case 'approval':
            status = 'Approval Process';
            break;
        case 'declined':
            status = 'Declined';
            break;
        case 'withdrawn':
            status = 'Withdrawn';
            break;
        case 'project':
            status ='Approved Project';
            break;
        default:
            status = element.status;
    }

    element.status = status;
    return element;
}

module.exports = router;
