import { MoonIcon, SunIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type Theme = "light" | "dark";

function readTheme(): Theme {
	return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export default function ThemeToggle() {
	const [theme, setTheme] = useState<Theme>("light");

	useEffect(() => setTheme(readTheme()), []);

	function toggle() {
		const next: Theme = theme === "dark" ? "light" : "dark";
		document.documentElement.classList.toggle("dark", next === "dark");
		try {
			localStorage.setItem("theme", next);
		} catch {}
		setTheme(next);
	}

	return (
		<Button variant="ghost" size="icon" onClick={toggle} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}>
			{theme === "dark" ? <SunIcon weight="bold" /> : <MoonIcon weight="bold" />}
		</Button>
	);
}
