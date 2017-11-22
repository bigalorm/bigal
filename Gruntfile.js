'use strict';

module.exports = (grunt) => {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    eslint: {
      dist: {
        files: [{
          expand: true,
          cwd: './',
          src: ['lib/**/*.js', 'test/**/*.js'],
        }],
        options: {
          cache: true,
          fix: true,
        },
      },
    },
    jsbeautifier: {
      dist: {
        files: [{
          expand: true,
          cwd: './',
          src: ['lib/**/*.js', 'test/**/*.js'],
        }],
        options: {
          config: '.jsbeautifyrc',
        },
      },
    },
  });

  grunt.loadNpmTasks('grunt-eslint');
  grunt.loadNpmTasks('grunt-jsbeautifier');
};
