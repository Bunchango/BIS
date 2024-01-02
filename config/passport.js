const passport = require("passport");
const {Reader, User} = require("./../models/user");
require('dotenv').config({path: "./config/config.env"});
const GoogleStrategy = require("passport-google-oauth20");
const FacebookStrategy = require('passport-facebook');
const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcrypt");

// Serialize
passport.serializeUser((user, done) => {
    done(null, user.id); // id from the database, appears as _id
})

// Deserialize 
passport.deserializeUser((id, done) => {
    User.findById(id).then((user) => {
        done(null, user);
    })
})

// Different type of strategies all share 1 account with 1 unique email only
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID, 
    clientSecret: process.env.GOOGLE_CLIENT_SECRET, 
    callbackURL: "/checkin/google/redirect",
    }, (accessToken, refreshToken, profile, done) => {
        // Check if user already exists using gmail
        User.findOne({gmail: profile.emails[0].value}).then((currentUser) => {
            if (currentUser) {
                // User already exists then login
                done(null, currentUser);
            } else {
                // User does not exists then create a new Reader
                try {
                    new Reader({
                        username: profile.displayName, 
                        gmail: profile.emails[0].value, 
                        googleId: profile.id,
                        profilePicture: profile.photos[0].value
                    }).save().then((newReader) => {
                        done(null, newReader);
                    })
                } catch(e) {
                    console.log(e);
                }
            }
        })
    })
)

// Facebook strategy (profile picture does not work as the app is currently dev)
passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_ID, 
    clientSecret: process.env.FACEBOOK_SECRET,
    callbackURL: "/checkin/facebook/redirect",
    profileFields: ["id", "displayName", "email", "photos"]
}, (accessToken, refreshToken, profile, done) => {
    User.findOne({gmail: profile.emails[0].value}).then((currentUser) => {
        if (currentUser) {
            done(null, currentUser);
        } else {
            try {
                new Reader({
                    username: profile.displayName,
                    gmail: profile.emails[0].value, 
                    facebookId: profile.id, 
                }).save().then((newReader) => {
                    done(null, newReader);
                })
            } catch(e) {
                console.log(e);
            }
        }
    })
}))

// Local Strategy
passport.use(new LocalStrategy({
    usernameField: "gmail", 
    passwordField: "password",
}, async (gmail, password, done) => {
    const user = await User.findOne({gmail: gmail})
    if (!user) {
        return done(null, false, {message: "Password incorrect or user not found"});
    }

    try {
        if (await bcrypt.compare(password, user.password)) {
            return done(null, user);
        } else {
            return done(null, false, {message: "Password incorrect or user not found"})
        }
    } catch(e) {
        return done(e);
    }
}))