let elems = {};
let renderstate = {};

function x(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function insert_game_html() {
  let gamePanel = document.getElementsByTagName("game")[0];
  gamePanel.replaceChildren(
    document.getElementById("game").content.cloneNode(true)
  );
  styleGameContainer();

  [
    "prompt",
    "bonus",
    "input",
    "timer",
    "order",
    "username",
    "buttons",
    "players",
  ].forEach((x) => {
    elems[x] = document.getElementById(x);
  });
  timerLoop();

  if (IS_HOST) {
    let host_panel = document.getElementById("right-panel");
    host_panel.replaceChildren(
      document.getElementById("settings").content.cloneNode(true)
    );
    document.getElementById("anyone_can_start_input").value =
      DEFAULT_ANYONE_CAN_START;
    document.getElementById("seconds_input").value = DEFAULT_SECONDS;
    document.getElementById("lives_input").value = DEFAULT_LIVES;
    document.getElementById("alphabet_input").value = DEFAULT_ALPHABET;
  }
}

function render(state, label) {
  const buttonsElem = elems["buttons"];

  renderPlayers(state);

  if (!state.started) {
    ["prompt", "bonus", "input", "timer", "order"].forEach(
      (x) => (elems[x].innerHTML = "")
    );

    if (label in state.queue) {
      if (state.settings.anyone_can_start || IS_HOST) {
        buttonsElem.innerHTML = `
          <div class="pre-game-buttons">
            <button class="game-core-button" id="start-button" onclick="startGame()">Start Game</button>
            <button type="button" class="game-core-button leave-game-btn" onclick="leaveGame()">Leave game</button>
          </div>
        `;
      }
    } else {
      buttonsElem.innerHTML = `<button type="button" class="pre-game-buttons" style="margin-top: -1.4rem;" onclick="enterGame()">Join next game</button>`;
    }
  } else {
    styleGameContainer();
    renderTimer(state);
    renderPrompt(state);
    renderBonus(state, label);
    renderInput(state, label);
    renderOrder(state);
  }
}

function renderTimer(state) {
  elems["timer"].innerHTML = `(${Math.max(
    0,
    ~~Math.ceil((state.game.deadline - Date.now()) / 1000)
  )} sec)`;
}

function renderInput(state, label) {
  let isMyTurn = state.game.order[state.game.turn] == label;
  let textinput = document.getElementById("textinput");
  if (!textinput) {
    elems[
      "input"
    ].innerHTML = `<input type='text' id='textinput' onkeyup='typed(this)' onchange='submit(this)' ${
      !isMyTurn ? "disabled" : ""
    } value='${state.game.typed}'>`;
    textinput = document.getElementById("textinput");
  } else if (!isMyTurn || (state.game.typed == "" && textinput.disabled)) {
    textinput.value = state.game.typed;
  }
  textinput.disabled = !isMyTurn;
  if (isMyTurn && state.game.typed == "") {
    textinput.focus();
  }
}

function renderPrompt(state) {
  elems["prompt"].innerHTML = `<h2>Type a word containing: ${x(
    state.game.query
  )}</h2>`;
}

function renderBonus(state, label) {
  if (state.game.order.includes(label)) {
    let letters_to_use = "";
    for (const [key, value] of Object.entries(state.game.letters[label])) {
      if (value > 0) {
        letters_to_use += key;
      }
    }
    if (letters_to_use.length > 0) {
      elems["bonus"].innerHTML = `Bonus life when using all letters: ${x(
        letters_to_use
      )}`;
    } else {
      elems["bonus"].innerHTML = "";
    }
  }
}

function renderOrder(state) {
  elems["order"].innerHTML =
    "<ul>" +
    state.game.order
      .map((label, idx) => {
        let name = x(state.players[label]);
        let turn = state.game.turn == idx;
        if (turn) {
          name = `<b>${name}</b>`;
        }
        return `<li ${turn ? "" : 'style="list-style:none"'}>${
          IS_HOST ? kickInOrder(label) : ""
        } ${name} ${hearts(state.game.lives[label])} - ${x(
          state.game.lastSolve[label]
        )}</li>`;
      })
      .join("") +
    "</ul>";
}

function kickInOrder(label) {
  return `<span onclick="removePlayerFromGame('${x(
    label
  )}');sendStateUpdate()">&#10060;</span>`;
}

function renderPlayers(state) {
  elems["players"].innerHTML = Object.keys(state.players)
    .map((label) => {
      let name = x(state.players[label]).substring(0, 20);
      let queued = label in state.queue;
      name = `<b>${name}</b>`;
      return `<li ${queued ? "" : 'style="list-style:none"'}>${name}</li>`;
    })
    .join("");
}

function timerLoop() {
  if (state?.started && state?.game?.deadline) {
    setTimeout(() => {
      renderTimer(state);
      timerLoop();
    }, (state.game.deadline - Date.now()) % 1000);
  } else {
    elems["timer"].innerHTML = "";
    setTimeout(() => {
      timerLoop();
    }, 1000);
  }
}

function hearts(times) {
  return (String.fromCodePoint(10084) + String.fromCodePoint(65039)).repeat(
    times
  );
}

function insertJoinURL(url) {
  const inviteAnchor = document.getElementById("invite");
  if (!inviteAnchor) {
    console.warn("No element with id 'invite' found");
    return;
  }

  inviteAnchor.href = url;
  inviteAnchor.textContent = "Invite Players";
  inviteAnchor.target = "_blank";
  inviteAnchor.onclick = function (event) {
    navigator.clipboard
      .writeText(url)
      .then(() => {
        console.log("Copied to clipboard:", url);
      })
      .catch((err) => {
        console.error("Clipboard copy failed:", err);
      });
  };
}

document.addEventListener("DOMContentLoaded", () => {
  if (IS_HOST) {
    const settingsIcon = document.getElementById("settings-icon");
    const menuIcon = document.getElementById("menu-icon");

    settingsIcon.addEventListener("click", () => togglePanel("right"));
    menuIcon.addEventListener("click", () => togglePanel("left"));

    const leftPanel = document.getElementById("left-panel");

    leftPanel.addEventListener("scroll", () => {
      if (leftPanel.scrollTop === 0) {
        menuIcon.style.display = "block";
      } else {
        menuIcon.style.display = "none";
      }
    });

    if (leftPanel.scrollTop === 0) {
      menuIcon.style.display = "block";
    } else {
      menuIcon.style.display = "none";
    }
  } else {
    document.getElementById("settings-icon").classList.add("hidden");
  }
});

function togglePanel(side) {
  const leftPanel = document.getElementById("left-panel");
  const rightPanel = document.getElementById("right-panel");
  const settings = document.getElementById("settings");

  if (side === "left") {
    const isOpen = leftPanel.classList.contains("open");

    if (rightPanel.classList.contains("open")) {
      rightPanel.classList.remove("open");
      settings.classList.remove("shift-right");
    }

    if (isOpen) {
      leftPanel.classList.remove("open");
      settings.classList.remove("shift-left");
    } else {
      leftPanel.classList.add("open");
      settings.classList.add("shift-left");
    }
  } else if (side === "right") {
    const isOpen = rightPanel.classList.contains("open");

    if (leftPanel.classList.contains("open")) {
      leftPanel.classList.remove("open");
      settings.classList.remove("shift-left");
    }

    if (isOpen) {
      rightPanel.classList.remove("open");
      settings.classList.remove("shift-right");
    } else {
      rightPanel.classList.add("open");
      settings.classList.add("shift-right");
    }
  }
}

function styleGameContainer() {
  const gameContainer = document.getElementsByTagName("game")[0];
  if (!gameContainer) return;

  gameContainer.style.position = "relative";
  gameContainer.style.top = "unset";
  gameContainer.style.left = "unset";
  gameContainer.style.transform = "none";

  gameContainer.style.display = "block";
  gameContainer.style.margin = "0 auto";
  gameContainer.style.width = "auto";
  gameContainer.style.background = "var(--card-bg)";
  gameContainer.style.borderRadius = "24px";
  gameContainer.style.boxShadow =
    "0 10px 25px rgba(0, 0, 0, 0.22), 0 5px 10px rgba(0, 0, 0, 0.15)";
  gameContainer.style.padding = "2rem 2.5rem";
  gameContainer.style.fontWeight = "500";
  gameContainer.style.color = "var(--text-color)";
  gameContainer.style.transition =
    "box-shadow 0.35s cubic-bezier(0.4, 0, 0.2, 1), transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)";
}
