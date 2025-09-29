import passport from 'passport'
import {Strategy as GoogleStrategy} from 'passport-google-oauth20'
import {} from 'passport-local'
import {} from 'passport-jwt'

passport.use(
    newLocalStrategy({ usernameField: 'email', passwordField: 'password' }),
)