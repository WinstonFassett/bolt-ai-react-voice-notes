https://docs.sentry.io/platforms/javascript/sourcemaps/uploading/vite/

Automatic Setup
The easiest way to configure uploading source maps with Vite is by using the Sentry Wizard:

Bash

Copied
npx @sentry/wizard@latest -i sourcemaps
The wizard will guide you through the following steps:

Logging into Sentry and selecting a project
Installing the necessary Sentry packages
Configuring your build tool to generate and upload source maps
Configuring your CI to upload source maps

The Sentry Vite plugin doesn't upload source maps in watch-mode/development-mode. We recommend running a production build to test your configuration.