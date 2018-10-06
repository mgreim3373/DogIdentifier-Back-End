// Express docs: http://expressjs.com/en/api.html
const express = require('express')
// export GOOGLE_APPLICATION_CREDENTIALS="/Users/mikegreim/wdi/projects/dogFinder/express-api-template/keys.json"
// const vision = require('@google-cloud/vision')
// const client = new vision.ImageAnnotatorClient()

// google vision request
// client
//   .labelDetection('/Users/mikegreim/wdi/projects/dogFinder/express-api-template/1a5a259bdbdb2155a5cb46de25caeaba.jpg')
//   .then(results => {
//     const labels = results[0].labelAnnotations;
//
//     console.log('data');
//     labels.forEach(label => console.log(label.description, label.score));
//   })
//   .catch(err => {
//     console.error('ERROR:', err);
//   });
// google vision request end

// Passport docs: http://www.passportjs.org/docs/
const passport = require('passport')

// pull in Mongoose model for examples
const Dog = require('../models/dog')

// we'll use this to intercept any errors that get thrown and send them
// back to the client with the appropriate status code
const handle = require('../../lib/error_handler')

// this is a collection of methods that help us detect situations when we need
// to throw a custom error
const customErrors = require('../../lib/custom_errors')

// we'll use this function to send 404 when non-existant document is requested
const handle404 = customErrors.handle404
// we'll use this function to send 401 when a user tries to modify a resource
// that's owned by someone else
const requireOwnership = customErrors.requireOwnership

// passing this as a second argument to `router.<verb>` will make it
// so that a token MUST be passed for that route to be available
// it will also set `res.user`
const requireToken = passport.authenticate('bearer', { session: false })

// instantiate a router (mini app that only handles routes)
const router = express.Router()

// INDEX
// GET /dogs
router.get('/dogs', requireToken, (req, res) => {
  Dog.find()
      // handle404 = if there is not data, return error message
      // else return the data
    .then(handle404)
    .then(dogs => {
      // `dogs` will be an array of Mongoose documents
      // we want to convert each one to a POJO, so we use `.map` to
      // apply `.toObject` to each one
      return dogs.map(dog => dog.toObject())
    })
    // respond with status 200 and JSON of the dogs
    .then(dogs => res.status(200).json({ dogs: dogs }))
    // if an error occurs, pass it to the handler
    .catch(err => handle(err, res))
})

// SHOW
// GET /examples/5a7db6c74d55bc51bdf39793
router.get('/dogs/:id', requireToken, (req, res) => {
  // req.params.id will be set based on the `:id` in the route
  Dog.findById(req.params.id)
    .then(handle404)
    // if `findById` is succesful, respond with 200 and "example" JSON
    .then(dog => res.status(200).json({ dog: dog.toObject() }))
    // if an error occurs, pass it to the handler
    .catch(err => handle(err, res))
})

// CREATE
// POST /examples
router.post('/dogs', requireToken, (req, res) => {
  // set owner of new example to be current user
  req.body.dogs.owner = req.user.id

  Dog.create(req.body.dogs)
    // respond to succesful `create` with status 201 and JSON of new "dog"
    .then(dog => {
      res.status(201).json({ dogs: dog.toObject() })
    })
    // if an error occurs, pass it off to our error handler
    // the error handler needs the error message and the `res` object so that it
    // can send an error message back to the client
    .catch(err => handle(err, res))
})

// UPDATE
// PATCH /examples/5a7db6c74d55bc51bdf39793
router.patch('/dogs/:id', requireToken, (req, res) => {
  // if the client attempts to change the `owner` property by including a new
  // owner, prevent that by deleting that key/value pair
  delete req.body.dog.owner

  Dog.findById(req.params.id)
    .then(handle404)
    .then(dog => {
      // pass the `req` object and the Mongoose record to `requireOwnership`
      // it will throw an error if the current user isn't the owner
      requireOwnership(req, dog)

      // the client will often send empty strings for parameters that it does
      // not want to update. We delete any key/value pair where the value is
      // an empty string before updating
      Object.keys(req.body.dog).forEach(key => {
        if (req.body.dog[key] === '') {
          delete req.body.dog[key]
        }
      })

      // pass the result of Mongoose's `.update` to the next `.then`
      return dog.update(req.body.dog)
    })
    // if that succeeded, return 204 and no JSON
    .then(() => res.sendStatus(204))
    // if an error occurs, pass it to the handler
    .catch(err => handle(err, res))
})

// DESTROY
// DELETE /examples/5a7db6c74d55bc51bdf39793
router.delete('/dogs/:id', requireToken, (req, res) => {
  Dog.findById(req.params.id)
    .then(handle404)
    .then(dog => {
      // throw an error if current user doesn't own `dog`
      requireOwnership(req, dog)
      // delete the example ONLY IF the above didn't throw
      dog.remove()
    })
    // send back 204 and no content if the deletion succeeded
    .then(() => res.sendStatus(204))
    // if an error occurs, pass it to the handler
    .catch(err => handle(err, res))
})

module.exports = router