# @file   .github/test-image/Dockerfile
# @brief  The kit's small test image: one static page on port 8080, for the proof runs of the
#         reusable scan and image workflows. Never published as part of the kit.
# Source: new in the kit; the base is the nginx the ops tests pin (.github/workflows/ci.yml).
FROM docker.io/library/nginx:1.27.5-alpine@sha256:65645c7bb6a0661892a8b03b89d0743208a18dd2f3f17a54ef4b76fb8e2f2a10
COPY default.conf /etc/nginx/conf.d/default.conf
COPY index.html /usr/share/nginx/html/index.html
