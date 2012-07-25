# auto-compile with Compass and Sass
guard 'compass' do
  watch(%r{^httpdocs/css/src/.+(\.s[ac]ss)})
end
 
# reload the browser when assets change
guard 'livereload' do
  watch(%r{^httpdocs/.+\.html})
  watch(%r{^httpdocs/css/.+\.css})
  watch(%r{^httpdocs/js/.+\.js})
end