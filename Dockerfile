# Development environment for Word Add-in
FROM node:18-alpine

# Install git, bash, and Doppler CLI for development
RUN apk add --no-cache git bash curl gnupg && \
    curl -Ls --tlsv1.2 --proto "=https" --retry 3 https://cli.doppler.com/install.sh | sh

# Set working directory
WORKDIR /workspace

# Install global tools needed for Office Add-in development
RUN npm install -g yo generator-office

# Create non-root user for development
RUN addgroup -S developer || true && \
    adduser -D -s /bin/bash -G developer developer || adduser -D -s /bin/bash developer

# Switch to developer user
USER developer

# Expose port for development server
EXPOSE 3000

# Default command
CMD ["/bin/bash"]
