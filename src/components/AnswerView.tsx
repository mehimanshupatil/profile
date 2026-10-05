import { Renderer } from "@openuidev/react-lang";
import { type ProjectCard, ProjectsContext, library } from "@/openui/library";

/** A stored Answer rendered without replay (used for Lens intros). */
export default function AnswerView({ code, projects }: { code: string; projects: Record<string, ProjectCard> }) {
	return (
		<ProjectsContext.Provider value={projects}>
			<Renderer response={code} library={library} />
		</ProjectsContext.Provider>
	);
}
