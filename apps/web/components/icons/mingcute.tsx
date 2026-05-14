import type { SVGProps } from "react";
import addLine from "@iconify-icons/mingcute/add-line";
import alertLine from "@iconify-icons/mingcute/alert-line";
import androidLine from "@iconify-icons/mingcute/android-line";
import anticlockwiseLine from "@iconify-icons/mingcute/anticlockwise-line";
import arrowLeftLine from "@iconify-icons/mingcute/arrow-left-line";
import arrowRightLine from "@iconify-icons/mingcute/arrow-right-line";
import arrowRightUpLine from "@iconify-icons/mingcute/arrow-right-up-line";
import arrowToDownLine from "@iconify-icons/mingcute/arrow-to-down-line";
import arrowToUpLine from "@iconify-icons/mingcute/arrow-to-up-line";
import arrowUpLine from "@iconify-icons/mingcute/arrow-up-line";
import arrowsLeftLine from "@iconify-icons/mingcute/arrows-left-line";
import brushLine from "@iconify-icons/mingcute/brush-line";
import chartPieLine from "@iconify-icons/mingcute/chart-pie-line";
import checkLine from "@iconify-icons/mingcute/check-line";
import clockwiseLine from "@iconify-icons/mingcute/clockwise-line";
import closeLine from "@iconify-icons/mingcute/close-line";
import codeLine from "@iconify-icons/mingcute/code-line";
import copy2Line from "@iconify-icons/mingcute/copy-2-line";
import copyLine from "@iconify-icons/mingcute/copy-line";
import delete2Line from "@iconify-icons/mingcute/delete-2-line";
import documentLine from "@iconify-icons/mingcute/document-line";
import downLine from "@iconify-icons/mingcute/down-line";
import download2Line from "@iconify-icons/mingcute/download-2-line";
import externalLinkLine from "@iconify-icons/mingcute/external-link-line";
import fileForbidLine from "@iconify-icons/mingcute/file-forbid-line";
import fullscreenLine from "@iconify-icons/mingcute/fullscreen-line";
import gitBranchLine from "@iconify-icons/mingcute/git-branch-line";
import layerLine from "@iconify-icons/mingcute/layer-line";
import leftLine from "@iconify-icons/mingcute/left-line";
import loading3Line from "@iconify-icons/mingcute/loading-3-line";
import lockLine from "@iconify-icons/mingcute/lock-line";
import menuLine from "@iconify-icons/mingcute/menu-line";
import message3Line from "@iconify-icons/mingcute/message-3-line";
import moonLine from "@iconify-icons/mingcute/moon-line";
import more2Line from "@iconify-icons/mingcute/more-2-line";
import notebookLine from "@iconify-icons/mingcute/notebook-line";
import pencilLine from "@iconify-icons/mingcute/pencil-line";
import penLine from "@iconify-icons/mingcute/pen-line";
import picLine from "@iconify-icons/mingcute/pic-line";
import presentation2Line from "@iconify-icons/mingcute/presentation-2-line";
import questionLine from "@iconify-icons/mingcute/question-line";
import refreshAnticlockwise1Line from "@iconify-icons/mingcute/refresh-anticlockwise-1-line";
import rightLine from "@iconify-icons/mingcute/right-line";
import saveLine from "@iconify-icons/mingcute/save-line";
import searchLine from "@iconify-icons/mingcute/search-line";
import share2Line from "@iconify-icons/mingcute/share-2-line";
import sitemapLine from "@iconify-icons/mingcute/sitemap-line";
import sparklesLine from "@iconify-icons/mingcute/sparkles-line";
import squareFill from "@iconify-icons/mingcute/square-fill";
import sunLine from "@iconify-icons/mingcute/sun-line";
import textLine from "@iconify-icons/mingcute/text-line";
import trelloBoardLine from "@iconify-icons/mingcute/trello-board-line";
import upload2Line from "@iconify-icons/mingcute/upload-2-line";
import webLine from "@iconify-icons/mingcute/web-line";
import zoomOutLine from "@iconify-icons/mingcute/zoom-out-line";

type MingcuteIconData = {
  body: string;
  height?: number;
  left?: number;
  top?: number;
  width?: number;
};

type MingcuteIconProps = SVGProps<SVGSVGElement> & {
  icon: MingcuteIconData;
};

export function MingcuteIcon({
  icon,
  className,
  "aria-label": ariaLabel,
  ...props
}: MingcuteIconProps) {
  const { body, height = 24, left = 0, top = 0, width = 24 } = icon;

  return (
    <svg
      aria-hidden={ariaLabel ? undefined : true}
      aria-label={ariaLabel}
      className={className}
      dangerouslySetInnerHTML={{ __html: body }}
      fill="none"
      focusable="false"
      suppressHydrationWarning
      viewBox={`${left} ${top} ${width} ${height}`}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    />
  );
}

function createMingcuteIcon(icon: MingcuteIconData, displayName: string) {
  function Icon(props: SVGProps<SVGSVGElement>) {
    return <MingcuteIcon icon={icon} {...props} />;
  }

  Icon.displayName = displayName;

  return Icon;
}

export const AlertCircle = createMingcuteIcon(alertLine, "AlertCircle");
export const ArrowLeft = createMingcuteIcon(arrowLeftLine, "ArrowLeft");
export const ArrowRight = createMingcuteIcon(arrowRightLine, "ArrowRight");
export const ArrowUp = createMingcuteIcon(arrowUpLine, "ArrowUp");
export const ArrowUpRight = createMingcuteIcon(
  arrowRightUpLine,
  "ArrowUpRight"
);
export const Bot = createMingcuteIcon(androidLine, "Bot");
export const BringToFront = createMingcuteIcon(
  arrowToUpLine,
  "BringToFront"
);
export const Brush = createMingcuteIcon(brushLine, "Brush");
export const Check = createMingcuteIcon(checkLine, "Check");
export const ChevronDown = createMingcuteIcon(downLine, "ChevronDown");
export const ChevronLeft = createMingcuteIcon(leftLine, "ChevronLeft");
export const ChevronRight = createMingcuteIcon(rightLine, "ChevronRight");
export const ChevronRightIcon = createMingcuteIcon(
  rightLine,
  "ChevronRightIcon"
);
export const ChevronsLeft = createMingcuteIcon(
  arrowsLeftLine,
  "ChevronsLeft"
);
export const ClipboardCopy = createMingcuteIcon(
  copy2Line,
  "ClipboardCopy"
);
export const Code = createMingcuteIcon(codeLine, "Code");
export const Code2 = createMingcuteIcon(codeLine, "Code2");
export const Copy = createMingcuteIcon(copyLine, "Copy");
export const Download = createMingcuteIcon(download2Line, "Download");
export const ExternalLink = createMingcuteIcon(
  externalLinkLine,
  "ExternalLink"
);
export const FileForbid = createMingcuteIcon(
  fileForbidLine,
  "FileForbid"
);
export const FileText = createMingcuteIcon(documentLine, "FileText");
export const GitBranch = createMingcuteIcon(gitBranchLine, "GitBranch");
export const Globe2 = createMingcuteIcon(webLine, "Globe2");
export const HelpCircle = createMingcuteIcon(questionLine, "HelpCircle");
export const ImageIcon = createMingcuteIcon(picLine, "ImageIcon");
export const Layers3 = createMingcuteIcon(layerLine, "Layers3");
export const LayoutDashboard = createMingcuteIcon(
  trelloBoardLine,
  "LayoutDashboard"
);
export const Loader2 = createMingcuteIcon(loading3Line, "Loader2");
export const Loader2Icon = createMingcuteIcon(
  loading3Line,
  "Loader2Icon"
);
export const Lock = createMingcuteIcon(lockLine, "Lock");
export const Maximize2 = createMingcuteIcon(fullscreenLine, "Maximize2");
export const Menu = createMingcuteIcon(menuLine, "Menu");
export const MessageSquare = createMingcuteIcon(
  message3Line,
  "MessageSquare"
);
export const Minus = createMingcuteIcon(zoomOutLine, "Minus");
export const Moon = createMingcuteIcon(moonLine, "Moon");
export const MoreHorizontal = createMingcuteIcon(
  more2Line,
  "MoreHorizontal"
);
export const Pencil = createMingcuteIcon(pencilLine, "Pencil");
export const PenLine = createMingcuteIcon(penLine, "PenLine");
export const PieChart = createMingcuteIcon(chartPieLine, "PieChart");
export const Plus = createMingcuteIcon(addLine, "Plus");
export const Presentation = createMingcuteIcon(
  presentation2Line,
  "Presentation"
);
export const Redo2 = createMingcuteIcon(clockwiseLine, "Redo2");
export const RefreshCcw = createMingcuteIcon(
  refreshAnticlockwise1Line,
  "RefreshCcw"
);
export const Save = createMingcuteIcon(saveLine, "Save");
export const Search = createMingcuteIcon(searchLine, "Search");
export const SendToBack = createMingcuteIcon(arrowToDownLine, "SendToBack");
export const Share2 = createMingcuteIcon(share2Line, "Share2");
export const Sparkles = createMingcuteIcon(sparklesLine, "Sparkles");
export const Square = createMingcuteIcon(squareFill, "Square");
export const StickyNote = createMingcuteIcon(notebookLine, "StickyNote");
export const Sun = createMingcuteIcon(sunLine, "Sun");
export const Trash2 = createMingcuteIcon(delete2Line, "Trash2");
export const Type = createMingcuteIcon(textLine, "Type");
export const Undo2 = createMingcuteIcon(anticlockwiseLine, "Undo2");
export const Upload = createMingcuteIcon(upload2Line, "Upload");
export const Workflow = createMingcuteIcon(sitemapLine, "Workflow");
export const X = createMingcuteIcon(closeLine, "X");
export const XIcon = createMingcuteIcon(closeLine, "XIcon");
