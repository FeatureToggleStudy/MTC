'use strict'

const gulp = require('gulp')
const sass = require('gulp-sass')
const uglify = require('gulp-uglify')
const concat = require('gulp-concat')
const clean = require('gulp-clean')
const replace = require('gulp-replace')
const winston = require('winston')
require('dotenv').config()

const config = require('./config')

// These files will get uglified and packaged into `app.js`
const jsBundleFiles = [
  './node_modules/govuk-frontend/govuk/all.js',
  './assets/javascripts/jquery-1.12.4.js',
  './assets/javascripts/gds-cookie-banner.js',
  './assets/javascripts/gds-table-sorting.js',
  './assets/javascripts/gds-print-popup.js',
  './assets/javascripts/accessible-autocomplete.min.js',
  './assets/javascripts/util-checkbox.js',
  './assets/javascripts/global-scripts.js',
  './assets/javascripts/jquery-modal.js',
  './assets/javascripts/custom-file-upload.js',
  './assets/javascripts/pupil-filter-name.js',
  './assets/javascripts/pupil-filter-group.js',
  './assets/javascripts/mtc-autocomplete.js',
  './assets/javascripts/mtc-check-forms.js',
  './assets/javascripts/print-popup.js',
  './assets/javascripts/table-sorting.js',
  './assets/javascripts/session-expiry.js', // here be dragons
  './assets/javascripts/autocomplete.js',
  './assets/javascripts/pupil-access-arrangements-selection.js',
  './assets/javascripts/check-forms.js',
  './assets/javascripts/pupil-form.js'
]

/*
  session-expiry.js contains two strings that are claimed to be global variables.  The `bundlejs` task will replace
  these strings with values from config during the build.  If config has not loaded correctly the input to `uglify` will
  be incorrect and `uglify` will bomb-out with this message `{"message":"Unexpected token: punc «,»"}`
 */

gulp.task('sass', function () {
  return gulp.src('./assets/**/*.scss')
    .pipe(replace('/vendor/govuk-frontend/', `${config.AssetPath}vendor/govuk-frontend/`))
    .pipe(sass({ outputStyle: 'compressed' }).on('error', sass.logError))
    .pipe(gulp.dest('./public'))
})

gulp.task('watch', function () {
  gulp.watch('./assets/**/*.scss', gulp.series('sass'))
  gulp.watch('./assets/**/*.js', gulp.series('bundle-js'))
})

gulp.task('bundle-js', function () {
  return gulp.src(jsBundleFiles)
    .pipe(concat('app.js'))
    .pipe(replace('SESSION_DISPLAY_NOTICE_TIME', config.ADMIN_SESSION_DISPLAY_NOTICE_AFTER))
    .pipe(replace('SESSION_EXPIRATION_TIME', config.ADMIN_SESSION_EXPIRATION_TIME_IN_SECONDS))
    .pipe(uglify({
      ie8: true
    }).on('error', function (e) {
      winston.error(e)
    }))
    .pipe(gulp.dest('./public/javascripts/'))
})

gulp.task('clean', function () {
  return gulp.src([
    'public/javascripts/app.js',
    'public/stylesheets/application.css',
    'public/stylesheets/application-ie8.css'
  ], { read: false })
    .pipe(clean())
})

gulp.task('copy-images', function () {
  return gulp
    .src(['./assets/images/*'])
    .pipe(gulp.dest('public/images'))
})

gulp.task('copy-gds-images', function () {
  return gulp
    .src(['./node_modules/govuk-frontend/govuk/assets/images/*'])
    .pipe(gulp.dest('public/vendor/govuk-frontend/images'))
})

gulp.task('copy-gds-fonts', function () {
  return gulp
    .src(['./node_modules/govuk-frontend/govuk/assets/fonts/*'])
    .pipe(gulp.dest('public/vendor/govuk-frontend/fonts'))
})

gulp.task('copy-pdfs', function () {
  return gulp
    .src(['./assets/pdfs/*'])
    .pipe(gulp.dest('public/pdfs'))
})

gulp.task('copy-csv-files', function () {
  return gulp
    .src(['./assets/csv/*'])
    .pipe(gulp.dest('public/csv'))
})

gulp.task('realclean', gulp.series('clean'), function () {
  return gulp.src('./node_modules', { read: false })
    .pipe(clean())
})

gulp.task('build',
  gulp.parallel('sass',
    'bundle-js',
    'copy-images',
    'copy-gds-images',
    'copy-gds-fonts',
    'copy-pdfs',
    'copy-csv-files'))
