const gulp = require('gulp');
const nodemon = require('gulp-nodemon');

gulp.task('start', function (done) {
  nodemon({
    script: './src/daemon.js',
    ext: 'js',
    env: { 'NODE_ENV': 'development' },
    done: done
  });
});

gulp.task('default', gulp.series('start'));
