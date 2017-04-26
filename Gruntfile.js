module.exports = function(grunt) {
  'use strict';

  require('load-grunt-tasks')(grunt);

  grunt.initConfig({

    fhignore: ["src/**"],

    fhinclude: ["config/validation.js"],

    fhLintTarget: ['src/**/*.js', 'test/**/*.js', 'Gruntfile.js'],

    _test_runner: '_mocha',

    _unit_args: '-u exports -t 10000 --compilers js:babel-core/register',

    unit: ['echo $NODE_PATH', '<%= _test_runner %> <%= _unit_args %> --recursive ./src/**/*_test.js'],

    // use `grunt fh:testfile:{{unit_test_filename}}` to run a single test file
    unit_single: ['<%= _test_runner %> <%= _unit_args %> <%= unit_test_filename %>'],

    unit_cover: ['./node_modules/.bin/cross-env NODE_ENV=test ./node_modules/.bin/nyc --reporter=lcov --reporter=cobertura --reporter=text node_modules/.bin/_mocha -u exports -t 10000 --recursive ./src/**/*_test.js'],

    accept: ['./node_modules/.bin/cross-env NODE_ENV=test <%= _test_runner %> <%= _unit_args %> --recursive ./test/integration/setup.js ./test/integration/**/test_*.js'],
    accept_cover: [],

    "babel": {
      options: {
        sourceMap: true
      },
      dist: {
        files: [{
          expand: true,
          cwd: 'src',
          src: ['**/*.js', '!**/*_test.js'],
          dest: 'lib',
          ext: '.js'
        }]
      }
    },

    chmod: {
      options: {
        mode: '755'
      },
      binaries: {
        src: ['lib/app.js']
      }
    }
  });

  grunt.loadNpmTasks('grunt-fh-build');

  grunt.registerTask('unit', ['eslint', 'fh:unit']);
  grunt.registerTask('integration', ['eslint', 'babel', 'fh:accept']);

  grunt.registerTask('default', ['eslint', 'babel', 'chmod', 'fh:default']);

  grunt.registerTask('coverage', ['clean:fh-cov', 'shell:fh-run-array:unit_cover']);
};
