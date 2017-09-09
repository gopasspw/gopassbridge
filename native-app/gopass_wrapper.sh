#!/bin/bash

if [ -f ~/.gpg-agent-info ] && [ -n "$(pgrep gpg-agent)" ]; then
    source ~/.gpg-agent-info
    export GPG_AGENT_INFO
else
    eval $(gpg-agent --daemon)
fi

export PATH="$PATH:/usr/local/bin"
export GPG_TTY="$(tty)"
/usr/local/bin/gopass jsonapi
exit $?
