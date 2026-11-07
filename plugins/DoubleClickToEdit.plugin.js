/**
 * @name Double Click To Edit
 * @description Double click to edit your messages, reply to others, and copy selected text with configurable modifier keys.
 * @author tonys183
 * @version 0.0.1
 * @website https://github.com/tonys183/betterdiscord-plugins
 * @source https://github.com/tonys183/betterdiscord-plugins/blob/main/plugins/DoubleClickToEdit.plugin.js
 * @authorLink https://github.com/tonys183/
 */

/** @type {typeof import("react")} */
const React = BdApi.React,

	{ Webpack, Webpack: { Filters }, Data, Utils, ReactUtils } = BdApi,

	config = {},

	walkable = [
		"memoizedProps", "pendingProps", "message", "baseMessage",
		"children", "props", "child", "sibling"
	];


module.exports = class DoubleClickToEdit {


	constructor(meta) { config.info = meta; }

	start() {
		try {
			this.stop();
			this.reportedErrors = new Set();
			this.refreshModules();

			// Bind the native method to its clipboard object.
			this.copyToClipboard = text => typeof DiscordNative !== "undefined" && DiscordNative.clipboard
				? DiscordNative.clipboard.copy(text)
				: navigator.clipboard.writeText(text);

			//Settings
			this.FormSwitch = Webpack.getModule(Filters.byStrings('labelRow', 'checked'), { searchExports: true }) || (props => {
				return React.createElement("label", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", color: "var(--header-primary)", cursor: props.disabled ? "not-allowed" : "pointer", opacity: props.disabled ? 0.5 : 1 } },
					React.createElement("div", { style: { display: "flex", flexDirection: "column", maxWidth: "80%" } },
						React.createElement("div", { style: { fontSize: "16px", fontWeight: "500" } }, props.children),
						props.note && React.createElement("div", { style: { fontSize: "14px", color: "var(--text-muted)", marginTop: "4px", fontWeight: "400" } }, props.note)
					),
					React.createElement("input", {
						type: "checkbox",
						disabled: props.disabled,
						checked: props.value,
						onChange: (e) => props.onChange(e.target.checked),
						style: { width: "24px", height: "24px", cursor: props.disabled ? "not-allowed" : "pointer" }
					})
				);
			});
			this.RadioGroup = Webpack.getModule(m => Filters.byKeys('NOT_SET', 'NONE')(m?.Sizes), { searchExports: true }) || Webpack.getModule(m => m?.toString?.().includes("radioItemClassName"), { searchExports: true }) || (props => {
				return React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" } },
					props.options.map(opt => React.createElement("label", { key: opt.value, style: { display: "flex", alignItems: "center", gap: "8px", color: "var(--text-normal)", cursor: props.disabled ? "not-allowed" : "pointer", opacity: props.disabled ? 0.5 : 1 } },
						React.createElement("input", {
							type: "radio",
							disabled: props.disabled,
							checked: props.value === opt.value,
							onChange: () => props.onChange({ value: opt.value }),
							style: { margin: 0, cursor: props.disabled ? "not-allowed" : "pointer" }
						}),
						React.createElement("span", null, opt.name)
					))
				);
			});
			this.FormItem = Webpack.getModule(m => Filters.byStrings('titleId', 'errorId', 'setIsFocused')(m?.render), { searchExports: true }) || (props => React.createElement("div", null, props.children));

			//Load settings
			//Edit
			this.doubleClickToEditModifier = Data.load(config.info.slug, "doubleClickToEditModifier") ?? false;
			this.editModifier = Data.load(config.info.slug, "editModifier") ?? "shift";
			//Reply
			this.doubleClickToReply = Data.load(config.info.slug, "doubleClickToReply") ?? false;
			this.doubleClickToReplyModifier = Data.load(config.info.slug, "doubleClickToReplyModifier") ?? false;
			this.replyModifier = Data.load(config.info.slug, "replyModifier") ?? "shift";
			//Copy
			this.doubleClickToCopy = Data.load(config.info.slug, "doubleClickToCopy") ?? false;
			this.copyModifier = Data.load(config.info.slug, "copyModifier") ?? "shift";

			// Capture the container's gesture before Discord's child handlers.
			document.addEventListener("dblclick", this.doubleclickFunc, true);

		}
		catch (err) {
			this.stop();
			this.reportError("Could not start the plugin", err);
		}
	}

	//By doing this we make sure we're able to remove our event
	//otherwise it gets stuck on the page and never actually unloads.
	doubleclickFunc = (e) => {
		try { this.handler(e); }
		catch (err) { this.reportError("Could not handle the double click", err); }
	};

	stop = () => document.removeEventListener('dblclick', this.doubleclickFunc, true);

	getSettingsPanel() {
		//Anonymous function to preserve the this scope,
		//which also makes it an anonymous functional component;
		//Pretty neat.
		return () => {
			//Edit
			const [editEnableModifier, setEditEnableModifier] = React.useState(this.doubleClickToEditModifier),
				[editModifier, setEditModifier] = React.useState(this.editModifier),
				//Reply
				[reply, setReply] = React.useState(this.doubleClickToReply),
				[replyEnableModifier, setReplyEnableModifier] = React.useState(this.doubleClickToReplyModifier),
				[replyModifier, setReplyModifier] = React.useState(this.replyModifier),
				//Copy
				[copy, setCopy] = React.useState(this.doubleClickToCopy),
				[copyModifier, setCopyModifier] = React.useState(this.copyModifier);

			return [
				//Edit
				React.createElement(this.FormSwitch, {
					//The state that is loaded with the default value
					value: editEnableModifier,
					note: "Enable modifier for double clicking to edit",
					//Since onChange passes the current state we can simply invoke it as such
					onChange: (newState) => {
						//Saving the new state
						this.doubleClickToEditModifier = newState;
						Data.save(config.info.slug, "doubleClickToEditModifier", newState);
						setEditEnableModifier(newState);
					}
					//Discord Is One Of Those
				}, "Enable Edit Modifier"),
				React.createElement(this.FormItem, {
					disabled: !editEnableModifier,
					title: "Modifer to hold to edit a message"
				},
					React.createElement(this.RadioGroup, {
						disabled: !editEnableModifier,
						value: editModifier,
						options: [
							{ name: "Shift", value: "shift" },
							{ name: "Ctrl", value: "ctrl" },
							{ name: "Alt", value: "alt" }
						],
						onChange: (newState) => {
							this.editModifier = newState.value;
							Data.save(config.info.slug, "editModifier", newState.value);
							setEditModifier(newState.value);
						}
					})),

				React.createElement("div", { style: { marginBottom: "24px", borderBottom: "1px solid var(--background-modifier-accent)", paddingBottom: "24px" } }),

				//Reply
				React.createElement(this.FormSwitch, {
					value: reply,
					note: "Double click another's message and start replying.",
					onChange: (newState) => {
						this.doubleClickToReply = newState;
						Data.save(config.info.slug, "doubleClickToReply", newState);
						setReply(newState);
					}
				}, "Enable Replying"),
				React.createElement(this.FormSwitch, {
					disabled: !reply,
					value: replyEnableModifier,
					note: "Enable modifier for double clicking to reply",
					onChange: (newState) => {
						this.doubleClickToReplyModifier = newState;
						Data.save(config.info.slug, "doubleClickToReplyModifier", newState);
						setReplyEnableModifier(newState);
					}
				}, "Enable Reply Modifier"),
				React.createElement(this.FormItem, {
					disabled: (!reply || !replyEnableModifier),
					title: "Modifier to hold when replying to a message"
				},
					React.createElement(this.RadioGroup, {
						disabled: (!reply || !replyEnableModifier),
						value: replyModifier,
						options: [
							{ name: "Shift", value: "shift" },
							{ name: "Ctrl", value: "ctrl" },
							{ name: "Alt", value: "alt" }
						],
						onChange: (newState) => {
							this.replyModifier = newState.value;
							Data.save(config.info.slug, "replyModifier", newState.value);
							setReplyModifier(newState.value);
						}
					})),

				React.createElement("div", { style: { marginBottom: "24px", borderBottom: "1px solid var(--background-modifier-accent)", paddingBottom: "24px" } }),

				//Copy
				React.createElement(this.FormSwitch, {
					value: copy,
					note: "Copy selection before entering edit-mode.",
					onChange: (newState) => {
						this.doubleClickToCopy = newState;
						Data.save(config.info.slug, "doubleClickToCopy", newState);
						setCopy(newState);
					}
				}, "Enable Copying"),
				React.createElement(this.FormItem, {
					disabled: !copy,
					title: "Modifier to hold before copying text"
				},
					React.createElement(this.RadioGroup, {
						disabled: !copy,
						value: copyModifier,
						options: [
							{ name: "Shift", value: "shift" },
							{ name: "Ctrl", value: "ctrl" },
							{ name: "Alt", value: "alt" }
						],
						onChange: (newState) => {
							this.copyModifier = newState.value;
							Data.save(config.info.slug, "copyModifier", newState.value);
							setCopyModifier(newState.value);
						}
					}))
			];
		}
	}

	findStore(name, ...methods) {
		const store = Webpack.getStore?.(name);
		if (store && methods.every(method => typeof store[method] === "function")) return store;
		return Webpack.getModule(Filters.byKeys(...methods), { searchExports: true });
	}

	refreshModules() {
		this.CurrentUserStore = this.findStore("UserStore", "getCurrentUser", "getUser");
		this.MessageStore = this.findStore("MessageStore", "getMessage", "getMessages");
		this.ChannelStore = this.findStore("ChannelStore", "getChannel", "getDMFromUserId");
		this.MessageActions = Webpack.getModule(Filters.byKeys("startEditMessage"), { searchExports: true });
		this.replyAction = Webpack.getModule(
			Filters.byStrings('type:"CREATE_PENDING_REPLY"'), { searchExports: true }
		);
		this.Dispatcher = Webpack.getModule(Filters.byKeys("dispatch", "subscribe"), { searchExports: true });
	}

	reportError(message, error) {
		this.reportedErrors ??= new Set();
		if (this.reportedErrors.has(message)) return;
		this.reportedErrors.add(message);
		console.error("[DoubleClickToEdit] " + message, error ?? "");
		BdApi.UI?.showToast?.(config.info.name + ": " + message, { type: "error" });
	}

	resolveMessage(messageDiv) {
		// Read the clicked row, not a quoted message inside its React subtree.
		const ids = [messageDiv.getAttribute("data-list-item-id"), messageDiv.id]
			.map(value => value?.match(/^chat-messages[_-]+(\d+)[_-](\d+)$/))
			.find(Boolean);
		if (!ids) return null;
		const [, channelId, messageId] = ids;
		const matches = message => message?.id === messageId &&
			message?.channel_id === channelId && !!message?.author?.id;
		const stored = this.MessageStore?.getMessage(channelId, messageId);
		if (matches(stored)) return stored;

		// Search results can have a React message before it reaches MessageStore.
		const instance = ReactUtils.getInternalInstance(messageDiv);
		return instance ? Utils.findInTree(instance, matches, { walkable }) : null;
	}

	handler(e) {
		if (e.button != null && e.button !== 0) return;
		const target = e.target?.nodeType === 3 ? e.target.parentElement : e.target;
		if (!target?.closest || target.closest(
			'a, button, input, textarea, select, [contenteditable="true"], ' +
			'video, audio, [class*="reactionInner"], [class*="emoji"], [class*="username"], [class*="avatar"]'
		)) return;

		// Prefer the complete message row, including its empty space. A nested
		// content div or quote is not the message container. Do not reject the
		// whole row just because Discord gives a wrapper role="button".
		const messageDiv = target.closest('[id^="chat-messages-"]') ||
			target.closest('[data-list-item-id^="chat-messages"]');
		if (!messageDiv || messageDiv.querySelector('textarea, [contenteditable="true"]')) return;

		// Discord may load these modules after the plugin starts.
		if (!this.CurrentUserStore || !this.MessageStore || !this.MessageActions) this.refreshModules();
		const message = this.resolveMessage(messageDiv);
		if (!message) {
			this.reportError("Could not resolve the clicked message container");
			return;
		}
		const currentUserId = this.CurrentUserStore?.getCurrentUser()?.id;
		if (!currentUserId) {
			this.reportError("Could not identify the current user; no action was taken");
			return;
		}

		if (this.checkForModifier(this.doubleClickToCopy, this.copyModifier, e)) {
			const selectedText = document.getSelection()?.toString();
			if (selectedText) {
				Promise.resolve(this.copyToClipboard(selectedText))
					.catch(err => this.reportError("Could not copy the selection", err));
			}
		}

		if (message.author.id === currentUserId) {
			// Own messages must never fall through to the reply action.
			e.stopPropagation?.();
			if (this.doubleClickToEditModifier && !this.checkForModifier(true, this.editModifier, e)) return;
			if (typeof this.MessageActions?.startEditMessage !== "function") {
				this.reportError("Discord's message editing action is unavailable");
				return;
			}
			e.preventDefault?.();
			this.MessageActions.startEditMessage(message.channel_id, message.id, message.content);
			return;
		}

		if (!this.doubleClickToReply ||
			(this.doubleClickToReplyModifier && !this.checkForModifier(true, this.replyModifier, e))) return;
		if (!this.ChannelStore || (!this.replyAction && !this.Dispatcher)) this.refreshModules();
		const channel = this.ChannelStore?.getChannel(message.channel_id);
		if (!channel) {
			this.reportError("Could not find the message channel");
			return;
		}
		const reply = { channel, message, shouldMention: true, showMentionToggle: channel.guild_id != null };
		if (typeof this.replyAction === "function" || this.Dispatcher) {
			e.stopPropagation?.();
			e.preventDefault?.();
			if (typeof this.replyAction === "function") this.replyAction(reply);
			else this.Dispatcher.dispatch({ type: "CREATE_PENDING_REPLY", ...reply });
		}
		else this.reportError("Discord's message reply action is unavailable");
	}

	/**
	 * 
	 * @param {boolean} enabled Is the modifier enabled
	 * @param {string} modifier Modifier key to be checked for
	 * @param {Event} event The event checked against
	 * @returns {boolean} Whether the modifier is enabled and the modifier is pressed
	 */
	checkForModifier(enabled, modifier, event) {
		if (enabled)
			switch (modifier) {
				case "shift": return event.shiftKey;
				case "ctrl": return event.ctrlKey;
				case "alt": return event.altKey;
			}
		return false;
	}
}
