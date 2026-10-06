from __future__ import annotations

from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.platypus import (
    BaseDocTemplate, Frame, PageTemplate, Paragraph, Spacer, PageBreak, Table,
    TableStyle, KeepTogether, Flowable, HRFlowable, ListFlowable, ListItem,
)

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf" / "Optical_Marketplace_Complete_User_Manual.pdf"

NAVY = colors.HexColor("#0E294B")
BLUE = colors.HexColor("#0875E1")
TEAL = colors.HexColor("#0B8C8B")
CYAN = colors.HexColor("#DDF6F4")
INK = colors.HexColor("#162236")
MUTED = colors.HexColor("#5B687A")
LINE = colors.HexColor("#DCE5EE")
PALE = colors.HexColor("#F5F8FC")
GREEN = colors.HexColor("#0E9F6E")
AMBER = colors.HexColor("#D97706")
ROSE = colors.HexColor("#DC4C64")
WHITE = colors.white


styles = getSampleStyleSheet()
styles.add(ParagraphStyle(
    name="ManualTitle", parent=styles["Title"], fontName="Helvetica-Bold",
    fontSize=31, leading=37, textColor=WHITE, alignment=TA_LEFT, spaceAfter=8,
))
styles.add(ParagraphStyle(
    name="CoverText", parent=styles["BodyText"], fontName="Helvetica",
    fontSize=12, leading=18, textColor=colors.HexColor("#DCEBFD"),
))
styles.add(ParagraphStyle(
    name="Section", parent=styles["Heading1"], fontName="Helvetica-Bold",
    fontSize=19, leading=23, textColor=NAVY, spaceBefore=0, spaceAfter=5,
))
styles.add(ParagraphStyle(
    name="SectionKicker", parent=styles["BodyText"], fontName="Helvetica-Bold",
    fontSize=8.5, leading=11, tracking=1.1, textColor=BLUE, spaceAfter=5,
))
styles.add(ParagraphStyle(
    name="Subsection", parent=styles["Heading2"], fontName="Helvetica-Bold",
    fontSize=12.5, leading=16, textColor=INK, spaceBefore=10, spaceAfter=5,
))
styles.add(ParagraphStyle(
    name="Body", parent=styles["BodyText"], fontName="Helvetica",
    fontSize=9.3, leading=14, textColor=INK, spaceAfter=6,
))
styles.add(ParagraphStyle(
    name="Small", parent=styles["BodyText"], fontName="Helvetica",
    fontSize=7.8, leading=10.8, textColor=MUTED, spaceAfter=3,
))
styles.add(ParagraphStyle(
    name="TableHead", parent=styles["BodyText"], fontName="Helvetica-Bold",
    fontSize=8.1, leading=10, textColor=WHITE,
))
styles.add(ParagraphStyle(
    name="TableCell", parent=styles["BodyText"], fontName="Helvetica",
    fontSize=8.05, leading=10.7, textColor=INK,
))
styles.add(ParagraphStyle(
    name="CardTitle", parent=styles["BodyText"], fontName="Helvetica-Bold",
    fontSize=9.2, leading=12, textColor=NAVY,
))
styles.add(ParagraphStyle(
    name="CardText", parent=styles["BodyText"], fontName="Helvetica",
    fontSize=8.15, leading=11.2, textColor=INK,
))
styles.add(ParagraphStyle(
    name="Step", parent=styles["BodyText"], fontName="Helvetica",
    fontSize=9, leading=13, textColor=INK,
    leftIndent=0, firstLineIndent=0, spaceAfter=3,
))


def p(text: str, style: str = "Body") -> Paragraph:
    return Paragraph(text, styles[style])


class Banner(Flowable):
    def __init__(self, label: str, color=BLUE):
        super().__init__()
        self.label = label
        self.color = color
        self.width = 170 * mm
        self.height = 7 * mm

    def draw(self):
        self.canv.setFillColor(self.color)
        self.canv.roundRect(0, 0, self.width, self.height, 3.5 * mm, stroke=0, fill=1)
        self.canv.setFillColor(WHITE)
        self.canv.setFont("Helvetica-Bold", 7.7)
        self.canv.drawString(4 * mm, 2.15 * mm, self.label.upper())


class ProcessFlow(Flowable):
    def __init__(self, steps: list[str], color=BLUE):
        super().__init__()
        self.steps = steps
        self.color = color
        self.width = 170 * mm
        self.height = 18 * mm

    def draw(self):
        canv = self.canv
        n = len(self.steps)
        gap = 3.0 * mm
        w = (self.width - gap * (n - 1)) / n
        for i, step in enumerate(self.steps):
            x = i * (w + gap)
            canv.setFillColor(colors.HexColor("#EEF5FE"))
            canv.setStrokeColor(colors.HexColor("#C7DAF3"))
            canv.roundRect(x, 2 * mm, w, 12 * mm, 2.5 * mm, stroke=1, fill=1)
            if i < n - 1:
                canv.setStrokeColor(self.color)
                canv.setLineWidth(1.2)
                canv.line(x + w + 0.6 * mm, 8 * mm, x + w + gap - 0.9 * mm, 8 * mm)
                canv.line(x + w + gap - 2.4 * mm, 9.4 * mm, x + w + gap - 0.9 * mm, 8 * mm)
                canv.line(x + w + gap - 2.4 * mm, 6.6 * mm, x + w + gap - 0.9 * mm, 8 * mm)
            canv.setFillColor(NAVY)
            canv.setFont("Helvetica-Bold", 7.2)
            usable = w - 5 * mm
            words = step.split()
            lines, line = [], ""
            for word in words:
                candidate = (line + " " + word).strip()
                if stringWidth(candidate, "Helvetica-Bold", 7.2) <= usable:
                    line = candidate
                else:
                    lines.append(line)
                    line = word
            if line:
                lines.append(line)
            y = 10.2 * mm + (len(lines) - 1) * 1.5 * mm
            for ln in lines:
                canv.drawCentredString(x + w / 2, y, ln)
                y -= 3.4 * mm


def bullet(items: list[str]) -> ListFlowable:
    return ListFlowable(
        [ListItem(p(item, "Body"), leftIndent=4 * mm) for item in items],
        bulletType="bullet", start="circle", leftIndent=5 * mm,
        bulletFontName="Helvetica", bulletFontSize=7, bulletColor=BLUE,
        spaceAfter=4,
    )


def steps(items: list[str]) -> ListFlowable:
    return ListFlowable(
        [ListItem(p(item, "Step"), leftIndent=5 * mm) for item in items],
        bulletType="1", start="1", leftIndent=5.5 * mm,
        bulletFontName="Helvetica-Bold", bulletFontSize=8.5, bulletColor=BLUE,
        spaceAfter=4,
    )


def feature_table(rows: list[tuple[str, str, str]], widths=(38 * mm, 39 * mm, 93 * mm)) -> Table:
    data = [[p("Feature", "TableHead"), p("Where", "TableHead"), p("What the user can do", "TableHead")]]
    for a, b, c in rows:
        data.append([p(a, "TableCell"), p(b, "TableCell"), p(c, "TableCell")])
    table = Table(data, colWidths=list(widths), repeatRows=1, hAlign="LEFT")
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("GRID", (0, 0), (-1, -1), 0.35, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 3.3 * mm),
        ("RIGHTPADDING", (0, 0), (-1, -1), 3.3 * mm),
        ("TOPPADDING", (0, 0), (-1, -1), 2.6 * mm),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2.6 * mm),
        ("BACKGROUND", (0, 1), (-1, -1), WHITE),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, PALE]),
    ]))
    return table


def card_grid(cards: list[tuple[str, str]], columns=2) -> Table:
    cells = []
    for title, text in cards:
        cells.append([p(title, "CardTitle"), Spacer(1, 1.5 * mm), p(text, "CardText")])
    rows = []
    for idx in range(0, len(cells), columns):
        row = cells[idx:idx + columns]
        while len(row) < columns:
            row.append("")
        rows.append(row)
    widths = [170 * mm / columns] * columns
    table = Table(rows, colWidths=widths, hAlign="LEFT")
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), WHITE),
        ("BOX", (0, 0), (-1, -1), 0.45, LINE),
        ("INNERGRID", (0, 0), (-1, -1), 0.45, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 4 * mm),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4 * mm),
        ("TOPPADDING", (0, 0), (-1, -1), 3.5 * mm),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5 * mm),
    ]))
    return table


def callout(title: str, text: str, tone: str = "blue") -> Table:
    palette = {
        "blue": (colors.HexColor("#EAF3FF"), BLUE),
        "teal": (colors.HexColor("#E6F8F7"), TEAL),
        "amber": (colors.HexColor("#FFF5E4"), AMBER),
        "rose": (colors.HexColor("#FDECEF"), ROSE),
    }[tone]
    data = [[p(title, "CardTitle"), p(text, "CardText")]]
    table = Table(data, colWidths=[33 * mm, 137 * mm], hAlign="LEFT")
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), palette[0]),
        ("BOX", (0, 0), (-1, -1), 0.45, palette[1]),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 4 * mm),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4 * mm),
        ("TOPPADDING", (0, 0), (-1, -1), 3 * mm),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3 * mm),
    ]))
    return table


def page(kicker: str, title: str, intro: str, blocks: list, marker: str | None = None) -> list:
    output = [Banner(marker or kicker), Spacer(1, 4 * mm), p(kicker.upper(), "SectionKicker"), p(title, "Section"), p(intro, "Body"), Spacer(1, 1.5 * mm)]
    output.extend(blocks)
    output.append(PageBreak())
    return output


def body_header_footer(canv, doc):
    canv.saveState()
    width, height = A4
    canv.setStrokeColor(LINE)
    canv.setLineWidth(0.5)
    canv.line(20 * mm, height - 15 * mm, width - 20 * mm, height - 15 * mm)
    canv.setFillColor(NAVY)
    canv.setFont("Helvetica-Bold", 7.4)
    canv.drawString(20 * mm, height - 11 * mm, "OPTICAL MARKETPLACE  |  CLIENT USER MANUAL")
    canv.setFillColor(MUTED)
    canv.setFont("Helvetica", 7.2)
    canv.drawRightString(width - 20 * mm, height - 11 * mm, "Current project documentation - 03 October 2026")
    canv.setStrokeColor(LINE)
    canv.line(20 * mm, 13 * mm, width - 20 * mm, 13 * mm)
    canv.setFillColor(MUTED)
    canv.setFont("Helvetica", 7.3)
    canv.drawString(20 * mm, 8.5 * mm, "VistaExpress / opty Amazon")
    canv.drawRightString(width - 20 * mm, 8.5 * mm, f"Page {doc.page}")
    canv.restoreState()


def cover(canv, doc):
    canv.saveState()
    width, height = A4
    canv.setFillColor(NAVY)
    canv.rect(0, 0, width, height, stroke=0, fill=1)
    canv.setFillColor(colors.HexColor("#123D6C"))
    canv.circle(width * .82, height * .81, 88 * mm, stroke=0, fill=1)
    canv.setFillColor(colors.HexColor("#0B8C8B"))
    canv.circle(width * .91, height * .70, 47 * mm, stroke=0, fill=1)
    canv.setFillColor(colors.HexColor("#0875E1"))
    canv.roundRect(20 * mm, height - 48 * mm, 42 * mm, 7 * mm, 3.5 * mm, stroke=0, fill=1)
    canv.setFillColor(WHITE)
    canv.setFont("Helvetica-Bold", 7.5)
    canv.drawCentredString(41 * mm, height - 45.6 * mm, "CLIENT DOCUMENTATION")
    canv.setFillColor(colors.HexColor("#C7E4FF"))
    canv.setFont("Helvetica", 8)
    canv.drawString(20 * mm, 23 * mm, "Prepared from the current Buyer, Seller, Admin and Laravel project source.")
    canv.drawString(20 * mm, 17 * mm, "Version: Current repository audit - 03 October 2026")
    canv.restoreState()


def add_section_heading(story: list, text: str):
    story.extend([Spacer(1, 2 * mm), p(text, "Subsection")])


def build_manual():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    frame = Frame(20 * mm, 18 * mm, 170 * mm, 254 * mm, leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
    doc = BaseDocTemplate(
        str(OUTPUT), pagesize=A4, leftMargin=20 * mm, rightMargin=20 * mm,
        topMargin=20 * mm, bottomMargin=18 * mm,
        pageTemplates=[
            PageTemplate(id="Cover", frames=[frame], onPage=cover),
            PageTemplate(id="Body", frames=[frame], onPage=body_header_footer),
        ],
        title="Optical Marketplace - Complete User Manual",
        author="VistaExpress / opty Amazon",
        subject="Client-ready guide for Buyer, Seller and Admin workflows",
    )
    story: list = []

    # Cover
    story.extend([
        Spacer(1, 67 * mm),
        p("Optical Marketplace", "ManualTitle"),
        p("Complete User Manual", "ManualTitle"),
        Spacer(1, 4 * mm),
        p("Buyer Website and Mobile App  |  Seller Portal  |  Admin Portal", "CoverText"),
        Spacer(1, 7 * mm),
        p("A simple, practical reference for the full marketplace project. It explains what each role can do, where each option is located, and how actions move through the platform.", "CoverText"),
        Spacer(1, 66 * mm),
        p("This document describes the functionality available in the current project source. Some options are shown only when the signed-in account has the required role, account status, or configured permissions.", "CoverText"),
        PageBreak(),
    ])
    story.append(PageBreak()) if False else None
    # switch to Body template after cover
    from reportlab.platypus import NextPageTemplate
    story.insert(-1, NextPageTemplate("Body"))

    # 1. Overview
    story += page("1. Platform Overview", "One marketplace, three working areas",
        "Optical Marketplace connects shoppers, stores and platform staff in one shared commerce system. Buyers discover and purchase optical products. Sellers run stores, fulfil orders and market products. Admin users supervise the platform, money flows and moderation.", [
            card_grid([
                ("Buyer", "Uses the Buyer Website or Buyer App to browse stores and products, configure optical items, place and pay for orders, communicate with stores, and manage account tools."),
                ("Seller", "Uses the Seller Portal to set up a store, publish products, accept and deliver orders, manage promotions, use the warehouse supply channel and communicate with buyers or Admin."),
                ("Admin", "Uses the Admin Portal to manage people, stores, catalogues, campaigns, orders, finance, reports, support and platform settings."),
                ("Shared Laravel backend", "Keeps accounts, products, orders, payments, messages, notifications, wallets and permissions in one source of data for all project frontends."),
            ]),
            Spacer(1, 5 * mm),
            ProcessFlow(["Buyer creates order", "Seller accepts and quotes delivery", "Buyer pays", "Seller ships and confirms delivery", "Admin supervises if needed"], TEAL),
            Spacer(1, 4 * mm),
            callout("Important", "The platform creates store-specific shipments inside an order. A buyer can place one checkout order containing items from more than one store; each store works on its own shipment and delivery status.", "teal"),
        ])

    story += page("1. Platform Overview", "How to read this manual",
        "This manual is written for a client or day-to-day user. It uses the same practical pattern throughout so each function is easy to find and understand.", [
            feature_table([
                ("What", "Feature name", "A short plain-English explanation of the purpose of the page, screen, card, tab or control."),
                ("Where", "Navigation path", "The usual route to the option. Desktop sidebars, headers, profile menus and the Buyer App tabs can expose the same function in different places."),
                ("Action", "Buttons, filters or forms", "The key choices a user can make, including search, status filters, add/edit forms, date fields, image uploads, toggle switches and confirmation dialogs."),
                ("Result", "After save, submit or confirm", "What the system updates next: a list, a status, wallet history, an order, a notification or another connected role."),
            ]),
            Spacer(1, 5 * mm),
            p("Reading notes", "Subsection"),
            bullet([
                "<b>Lists</b> normally support loading, empty and error states. Search, filters and page controls appear only where the feature needs them.",
                "<b>Dates and time</b> are shown in the user’s local display format. Scheduled campaign and coupon dates use the configured schedule/time-zone data.",
                "<b>Notifications</b> are role-specific. Opening a notification can mark it read and take the user to its related order, message or other record when a link is provided.",
                "<b>Permissions</b> matter. A seller pending approval, a suspended store, or an Admin account without an ability may see fewer actions.",
            ]),
            callout("Scope", "The project includes the Buyer Website, Buyer Expo mobile app, Seller Portal, Admin Portal, Laravel API and a read-only CRM integration. The manual documents the features found in those project areas; it does not invent future features.", "blue"),
        ])

    story += page("1. Platform Overview", "Navigation, account and list behaviour",
        "The visual layout differs by role, but the practical controls are consistent. This page explains recurring buttons and states so later sections can stay simple.", [
            feature_table([
                ("Sign in / sign out", "Headers, profile menus, auth pages", "Create an account, sign in, request a password reset, verify a code when the flow asks for it, and sign out to end the session."),
                ("Header icons", "Buyer and Seller headers", "Open notifications, cart or other role-specific quick tools. Badges show unread or item counts when data is available."),
                ("Search", "Catalogues and management lists", "Type a product, store, coupon, order or person reference. Submit or apply the query to refresh matching results."),
                ("Filters and sorting", "List pages", "Select status, type, scope, payment or other available values. Clear a filter to return to the full list."),
                ("Add / Edit", "Management pages", "Open a form or wizard, complete required fields, attach a file if needed and save. Validation messages explain missing or invalid values."),
                ("Toggle / Pause", "Status controls", "Turn a record on or off, or pause and resume it. History stays visible even when a record is paused or archived where supported."),
                ("Confirm dialog", "Delete, close, archive and finance actions", "Review the action before confirming. Destructive actions can remove or retire a record; order and finance histories remain protected by workflow rules."),
            ]),
            Spacer(1, 4 * mm),
            callout("Automatic updates", "The web and mobile clients use live refresh patterns for key data such as wallet balances, notifications, messages and management lists. A successful action also reloads the relevant record so the new state is visible.", "teal"),
        ])

    story += page("1. Platform Overview", "Platform relationships at a glance",
        "The same records are visible from different roles. For example, a product created by a Seller becomes a Buyer catalogue item after its state and visibility allow it; Admin has an oversight view.", [
            ProcessFlow(["Seller store and product", "Buyer catalogue and store page", "Cart and checkout", "Store shipment", "Wallet, review and analytics"], BLUE),
            Spacer(1, 4 * mm),
            feature_table([
                ("Product", "Seller Products -> Buyer Product Details -> Admin Products", "Seller owns product data; Buyer sees active products and options; Admin can inspect, approve/reject, control visibility, mute, boost or delete under its authority."),
                ("Store", "Seller Store -> Buyer Stores -> Admin Sellers / Store Reports", "Seller controls public profile, images and settings; Buyer can browse, follow, review, report or chat; Admin reviews seller/store actions and reports."),
                ("Order", "Buyer Checkout -> Seller Orders -> Admin Orders", "Buyer places and later pays a store shipment; Seller accepts, sets delivery information and confirms delivery; Admin can inspect and take permitted status actions."),
                ("Finance", "Buyer Wallet -> Seller Wallet -> Admin Finance", "Buyer wallet records funding/withdrawal transactions. Seller wallet records earnings, ad funding/spend and payouts. Admin sees platform-ledger, wallet and withdrawal controls."),
                ("Campaign", "Seller Marketing -> Buyer promotions -> Admin moderation", "Seller runs discount, coupon, referral, banner, announcement and boost work. Buyers receive eligible offers. Admin can supervise relevant campaigns and related finance."),
            ]),
        ])

    # Buyer
    story += page("2. Buyer User Manual", "Buyer access and account setup",
        "The Buyer Website has dedicated authentication pages and the Buyer App has onboarding plus sign-in choices. A buyer can create an account, recover access and manage personal information after signing in.", [
            feature_table([
                ("Choose account", "Buyer auth / Buyer App onboarding", "Choose the buyer route before registration. The public Sell page also explains how to start a seller application."),
                ("Register", "Buyer auth register", "Enter the requested buyer details, create a password and submit. The account is then used across the website and app."),
                ("Login", "Buyer auth login", "Enter email and password. The system returns to the requested page when a protected action triggered login."),
                ("Forgot / reset password", "Buyer auth pages", "Request a reset, enter the supplied code or required confirmation information, then choose a new password."),
                ("Email / phone verification", "Buyer profile", "Request and submit verification codes when shown. Profile security features can require a one-time email code for a password change."),
                ("Delete account", "Buyer profile account options", "Request account deletion from the protected profile control. Follow the confirmation message carefully because this is a sensitive action."),
            ]),
            callout("Mobile note", "The Buyer App mirrors the key account journey: onboarding, account choice, sign-in, sign-up, password recovery, email verification and authentication success before opening the shopping tabs.", "blue"),
        ])

    story += page("2. Buyer User Manual", "Buyer home, catalogue and categories",
        "The Buyer home experience is the starting point for discovery. It combines stores, products, promotional content and practical links into shopping areas.", [
            feature_table([
                ("Home", "Buyer header / Buyer App Home tab", "View the marketplace landing content, promotions, banners, product discovery cards and links into shopping areas."),
                ("Products", "Products page / Buyer App Shop tab", "Browse the product catalogue and open any item for full details. Product cards show the available image, name, price and store context."),
                ("Categories", "Categories -> category page", "Open a category and browse its products. Category results provide product search and price range fields; use the filter values to narrow the list."),
                ("Search", "Search page / top navigation", "Search products and stores from one input. Results are separated so the buyer can open the matching product or the store."),
                ("Campaigns and banners", "Home / campaign links", "Open eligible discount campaign pages and promotional banner destinations. Campaign pages show the campaign description, end date, minimum requirements and eligible products."),
                ("Advertisements", "Buyer catalogue placements", "View marketing placements served to buyers. Ad events are recorded by the platform when the configured placement is used."),
            ]),
            callout("Result", "Opening a product, category or store never changes the cart by itself. The buyer reviews details and options before choosing an add-to-cart or checkout action.", "teal"),
        ])

    story += page("2. Buyer User Manual", "Product details and optical customisation",
        "A Buyer product page is more than a product card. It can show product details, store information, reviews and configuration inputs needed for optical products.", [
            card_grid([
                ("Product details", "Open <b>Products -> product</b>. Review the product name, images, pricing, descriptions, store, available variants and reviews before selecting an action."),
                ("Product options", "Use the product-option selector to choose available variants or product-specific values. The system recalculates the selected item before it is placed in the cart."),
                ("Prescription entry", "For products that need prescription data, use the prescription entry flow. Buyers can use saved prescription data or provide the fields required by that product."),
                ("Lens configuration", "Where enabled, select lens type, thickness/material, treatments or coatings. The available choices are delivered by configured lens and category data."),
                ("Contact lenses and eye care", "Contact lens product forms expose their applicable configuration data. Eye hygiene products use their product-specific details and options."),
                ("Reviews", "Read product reviews and submit a review only through the allowed review workflow. Purchase eligibility is checked by the backend."),
            ]),
            Spacer(1, 4 * mm),
            steps([
                "Open the product and choose its options, size/variant or optical configuration where the product offers it.",
                "Review the chosen configuration and price in the product option or checkout confirmation view.",
                "Add the configured item to the cart, or continue with the product checkout action if it is offered.",
                "The resulting cart/order item keeps its product, variant, lens configuration and prescription data for the order workflow.",
            ]),
        ])

    story += page("2. Buyer User Manual", "Stores, follows, reviews and store chat",
        "Each Seller has a public store presence. Buyers can browse the store, see its products and interact with the store without leaving the Buyer experience.", [
            feature_table([
                ("All Stores", "Stores page / Buyer App Stores tab", "Search stores, open a store profile and browse the store’s available products."),
                ("Store profile", "Stores -> store", "See store information, product listings, active public social links and store reviews. The visible store data comes from the Seller store profile."),
                ("Follow / unfollow", "Store page and Profile -> Followed Stores", "Follow a store to keep it in the buyer’s follow list. Unfollow removes it from that personal list."),
                ("Store reviews", "Store page", "Read reviews and submit or manage a store review only where the buyer is eligible. The backend checks review rules."),
                ("Report a store", "Store page", "Describe an issue in the store report form. The report enters Admin store-report handling rather than changing the store immediately."),
                ("Store chat", "Store page -> chat / Buyer App Messages", "Start or open a conversation with a store. See the message history and send messages through the Buyer-to-Seller chat channel."),
            ]),
            callout("Connection", "A store’s active social links, banner/profile images, products and public details are maintained from the Seller side. The Buyer sees only the public/active result.", "blue"),
        ])

    story += page("2. Buyer User Manual", "Wishlist, saved items and shopping cart",
        "The buyer can save products for later and build a cart containing product selections. Cart operations are kept on the buyer account and are prepared for checkout.", [
            feature_table([
                ("Wishlist / Saved Items", "Wishlist page / Profile -> Saved Items", "Save a product, review saved product cards later, open the product again or remove it from saved items."),
                ("Cart", "Cart page / Buyer App Cart tab", "Review cart items and groups, update quantity where allowed, remove an item, clear the cart and continue to checkout."),
                ("Cart item data", "Cart item", "Shows the selected product and the option/configuration associated with it. This preserves choices such as a variant or lens configuration."),
                ("Order summary", "Cart and Checkout", "Shows item totals and calculated figures before order placement. Coupon and delivery values can affect the final store shipment amount."),
                ("Cart count", "Header / mobile navigation", "Shows that the buyer has items ready for checkout. The count changes after add, update, remove or clear actions."),
            ]),
            callout("Practical tip", "If an item needs product options or prescription information, complete that step before cart submission. A product cannot be treated as a final optical order until the required selection is valid.", "amber"),
        ])

    story += page("2. Buyer User Manual", "Coupons, discounts and checkout preview",
        "Eligible offers are calculated by the backend. The Buyer can discover a public promotion and, during cart/checkout, apply a valid coupon where the shipment qualifies.", [
            feature_table([
                ("Applicable coupons", "Cart / Checkout", "View coupon options that apply to the selected store, product or category context. A coupon may be limited by scope, dates, minimum amount, usage limits or buyer rules."),
                ("Validate coupon", "Cart / Checkout", "Enter or select a code. The system validates it against the order and shows the quote/result before it is applied."),
                ("Apply / remove", "Cart / Checkout", "Apply a valid coupon to the current calculation or remove it to return to the original price. The final quote is rechecked at order placement."),
                ("Discount campaign", "Campaign page / product pricing", "Open a campaign to view its rules and eligible products. Product/campaign pricing is calculated through the commerce campaign service."),
                ("Referral eligibility", "Referral campaign links", "A referral link can attribute a buyer to an eligible campaign. Rewards are only issued after the configured qualifying order outcome."),
            ]),
            Spacer(1, 4 * mm),
            ProcessFlow(["Cart items", "Coupon / campaign validation", "Checkout preview", "Order placed", "Seller reviews delivery and buyer pays"], TEAL),
        ])

    story += page("2. Buyer User Manual", "Checkout, payment and delivery address",
        "Checkout creates an order that can contain one or more store shipments. The website makes clear that payment follows seller review when the shipment requires a delivery quote.", [
            feature_table([
                ("Delivery address", "Checkout / Profile -> Addresses", "Choose an existing address or create, edit, delete and set a default address before placing an order."),
                ("Checkout preview", "Checkout", "Review delivery address, store/cart lines, discounts and the order summary before placing the order."),
                ("Place order", "Checkout", "Submit the order. The platform creates the buyer order plus store-specific shipment records for the participating sellers."),
                ("Seller review", "After placement", "The Seller receives a pending shipment and accepts/rejects it. On acceptance, the seller can set delivery fee, estimated date, method and notes."),
                ("Pay shipment", "My Orders -> order/shipment", "For a shipment awaiting payment, use the payment action. Payment information is loaded for the relevant store shipment."),
                ("Delivery data", "Order details", "See estimated delivery date, method, fee and notes after the Seller has supplied them. The buyer can later see the delivery code when it is issued."),
            ]),
            callout("Order structure", "A buyer-level order provides the combined checkout record. Each Seller receives only its own store shipment and its related items, payment and delivery action controls.", "teal"),
        ])

    story += page("2. Buyer User Manual", "Buyer orders, payment and completion",
        "My Orders and the Buyer App Orders tab show order history. An order opens into store shipments so the buyer can track and act on each seller’s part of the purchase.", [
            feature_table([
                ("Order list", "My Orders / Buyer App Orders", "Open completed and active orders, view store-shipment status badges and use review actions after an eligible delivery."),
                ("Order details", "Orders -> order", "See the buyer order, its store shipments, item lines, product variants, lens/prescription information, address snapshot, totals and payment information."),
                ("Shipment status", "Order details", "Track pending, awaiting payment, paid, processing, out for delivery, delivered, cancelled and other returned workflow states when applicable."),
                ("Delivery code (OTP)", "Order details", "When shown, provide the code only after receiving the products. It is used to confirm delivery and release seller earnings through the platform workflow."),
                ("Delivery summary", "Order and store-order detail", "Review address, estimated date, method, notes and delivery fee for that store shipment."),
                ("Review completed purchase", "Delivered shipment", "Review the store and each eligible product after delivery. The review form is tied to the relevant store order."),
            ]),
            callout("If something is wrong", "Use the order’s available cancellation/dispute/support path instead of changing information outside the platform. Admin order tools and store-report/support processes provide the oversight route.", "rose"),
        ])

    story += page("2. Buyer User Manual", "Buyer wallet, points and financial history",
        "Buyer account tools include a wallet and a points area. Wallet actions create history records; limits and payment methods are checked by the backend before a balance changes.", [
            feature_table([
                ("Wallet", "Profile -> Wallet", "See available balance, recent transactions and buttons for top up and withdrawal."),
                ("Top up", "Profile -> Wallet -> Top Up", "Enter a valid amount. The current interface validates a minimum of EUR 5 and records the successful funding action in transaction history."),
                ("Withdraw", "Profile -> Wallet -> Withdraw", "Enter an amount and bank details. The current interface validates available balance, a EUR 10 minimum, account holder, account number and bank name before submission."),
                ("Wallet transactions", "Profile -> Wallet", "Read date, description/type, payment method where provided, amount and transaction status. Referral rewards and reversals are clearly labelled."),
                ("Points", "Points page", "View points balance, transaction history and redemption options. Point rules are controlled by Admin."),
                ("Payment capability", "Wallet / checkout services", "The backend publishes wallet/payment capabilities so the client can present permitted funding or payment choices."),
            ]),
            callout("Result", "Top ups and withdrawals are not just visual balances. They write transaction records, and Admin Finance can audit buyer transactions and manage the relevant platform finance records.", "blue"),
        ])

    story += page("2. Buyer User Manual", "Buyer profile and personal settings",
        "The Buyer profile groups day-to-day account tools. On small screens, profile areas can open as a focused section while preserving the same underlying functions.", [
            card_grid([
                ("Edit profile", "Update personal account data and profile image. Image upload/delete actions use the buyer profile service."),
                ("Addresses", "Add, edit, remove and set a default shipping/billing address. Checkout uses the selected address snapshot."),
                ("Change password", "Start the protected password change process. The buyer flow confirms the change with a one-time code to the registered email."),
                ("Saved Items", "Open saved product cards, return to product details or remove a saved item."),
                ("Followed Stores", "Review followed store records and return to a store page or unfollow it."),
                ("Reviews", "Review the buyer’s review history and use eligible review forms from a delivered order/store order."),
                ("Referral", "Open buyer referral status/tools and campaign attribution details. Share/use only eligible campaign links."),
                ("Notifications", "Open all notifications, use unread counts and mark records read when the notification page action is used."),
            ]),
        ])

    story += page("2. Buyer User Manual", "Buyer messages, support and help",
        "The Buyer can communicate with stores through store chat and can open formal support tickets. These are separate workflows: a chat is a store conversation; a support ticket is an issue record for support handling.", [
            feature_table([
                ("Store messages", "Store page -> Chat / Buyer App Messages", "Open a store conversation, read message history and send a message. The conversation appears on the Seller side under buyer-store messages."),
                ("Support tickets", "Profile -> Support / Buyer App Support", "Create a ticket, choose its requested details, add attachments where the form supports them, view the ticket and reply."),
                ("Ticket actions", "Support ticket detail", "Read replies, download ticket attachments, close a resolved ticket or reopen it if the workflow permits."),
                ("Help Center", "Help page", "Read practical help on shopping/orders, payments/wallet, delivery, returns/refunds, account/security, selling/referrals and contact support."),
                ("Shipping / returns / terms / privacy", "Footer and help links", "Read current policy information. These pages explain delivery quoting, tracking, receipt confirmation, return windows, excluded items, cancellation and policy terms."),
            ]),
            callout("Good practice", "Attach only information needed to resolve a ticket. For a store-specific question before or after purchase, use the store chat first; for an unresolved platform issue, use Support.", "amber"),
        ])

    story += page("2. Buyer User Manual", "Buyer notifications, referral and affiliate areas",
        "Buyer notification and referral tools connect shopping actions to store and campaign activity. They preserve the buyer’s own history without exposing seller/admin private data.", [
            feature_table([
                ("Notifications", "Notifications page / header", "See unread count and notification list. Open a notification to mark/read it as applicable; use Mark All Read to clear unread state."),
                ("Referral campaign link", "Referral campaign public page", "Open a seller campaign by identifier. The page explains eligibility and guides a visitor to buyer registration or eligible browsing."),
                ("Referral dashboard", "Profile referral area", "See referral attribution/dashboard information and claim or view available referral details where the campaign permits."),
                ("Affiliate", "Affiliate page", "Access the project’s affiliate-facing buyer page. Availability and terms are controlled by the current site configuration."),
                ("Sell with us", "Sell page", "Read the seller application journey, approval explanation and what a seller can do after becoming live."),
            ]),
        ])

    story += page("2. Buyer User Manual", "Buyer App: mobile navigation map",
        "The Expo Buyer App is a mobile companion to the Buyer Website. It reuses the same Buyer account and backend data while arranging common shopping actions into mobile screens.", [
            feature_table([
                ("Home", "App tab", "Marketplace home and discovery cards."),
                ("Shop", "App tab", "Browse products, categories, search and open a product."),
                ("Stores", "App tab", "Browse stores, open a store profile and start store chat."),
                ("Cart", "App tab", "Review cart, manage items and continue to checkout."),
                ("Orders", "App tab", "Open order history and detailed order/shipment information."),
                ("Messages", "App tab", "Open buyer-store conversations."),
                ("Account", "App tab", "Profile, addresses, followed stores, referrals, reviews, saved items, support and wallet."),
                ("Other app screens", "Stack screens", "Onboarding, auth, notifications, category, search, product, store, checkout, order detail and chat screens are opened from the appropriate tab/action."),
            ]),
            callout("Shared data", "A profile, cart, wishlist, orders, wallet, messages, notifications and support records come from the same backend services. Users should use the same buyer account to see their history on web and mobile.", "teal"),
        ])

    # Seller
    story += page("3. Seller User Manual", "Seller access, application and approval",
        "A seller account has its own authentication and store setup path. The account can be pending approval or suspended, and the portal presents the status-specific page rather than opening normal management pages.", [
            feature_table([
                ("Register", "Seller auth -> Register", "Create a seller account with the requested business/user details and password confirmation."),
                ("Login", "Seller auth -> Login", "Sign in with the business email and password. Protected pages return the seller to the requested work area after access is granted."),
                ("Email verification", "Seller auth / account flow", "Verify email through the configured code-based flow when required."),
                ("Forgot / reset password", "Seller auth", "Request password recovery, enter the reset code and save a new password."),
                ("Initial store setup", "Seller onboarding", "Complete the store data needed before the seller begins normal operations."),
                ("Pending approval / suspended", "Seller auth status pages", "Read the current account state. A suspended store can access the reinstatement request flow where it is permitted."),
            ]),
            callout("Admin connection", "Admin Sellers contains approval/rejection controls. Store status is not merely a front-end display; it controls whether a seller can operate and whether public data is available to buyers.", "blue"),
        ])

    story += page("3. Seller User Manual", "Seller navigation and Dashboard",
        "The Seller Portal uses desktop sidebar navigation plus a mobile bottom navigation. The Dashboard is the operational starting point for performance, store health and recent work.", [
            feature_table([
                ("Desktop sidebar", "Seller left navigation", "Open Wallet, Dashboard, Store, Products, Orders, Discount Campaigns, Warehouse, Coupons, Notifications, Referral Campaigns, Boost Ads, Announcements, Banners, Analytics and Messages."),
                ("Mobile navigation", "Seller mobile layout", "Opens the main shortcuts available in the mobile layout: Wallet, Dashboard, Products, Orders, Promotions and Profile."),
                ("Dashboard", "Dashboard", "View store overview/dashboard data and take immediate action from the seller workspace."),
                ("Store statistics", "Store / Dashboard", "Review store stats, overview, dashboard figures and followers from the Store service."),
                ("Analytics", "Analytics", "See monthly trends, order status breakdown and recent orders. Use it to identify sales and fulfilment movement."),
                ("Low stock", "Product/inventory service", "The backend exposes low-stock inventory data for seller attention. Use product/inventory controls to correct stock."),
            ]),
            callout("Navigation rule", "Use the page’s Back link/browser history to return to the actual previous context. Lists, details and edit pages are separate routes, so an action should not require the user to restart from the Dashboard.", "teal"),
        ])

    story += page("3. Seller User Manual", "Store profile and public store management",
        "The Store area controls what buyers see on the public store page. It also provides business identity, professional information and policy text used by the marketplace.", [
            feature_table([
                ("Store overview", "Store", "See the current store identity and shortcuts to Edit Store, Store Settings and Social Links."),
                ("Images", "Store -> Edit Store", "Upload or delete the profile/logo image and banner image. Buyers see the current public store images when the store is visible."),
                ("Core information", "Store -> Edit Store", "Update store name, description, contact email and phone."),
                ("Professional information", "Store -> Edit Store", "Maintain tagline, business type, registration number, tax ID, business address, website and support email."),
                ("Policies", "Store -> Edit Store", "Enter or update shipping policy and return policy text for buyer-facing store context."),
                ("Theme", "Store service", "Update the store theme data where the store configuration exposes it."),
                ("Followers", "Store statistics", "View follower-related data supplied by the store overview/stats endpoint."),
            ]),
            callout("After Save", "A successful store update reloads the seller’s store profile. Public store pages use active/public store data, so buyers see the updated result through the shared backend.", "blue"),
        ])

    story += page("3. Seller User Manual", "Store settings, social links and store users",
        "Store settings are separate from profile content. They handle operating visibility/privacy options and supporting store-user access records.", [
            feature_table([
                ("Store settings", "Store -> Store Settings", "View and update store settings, including availability and phone visibility options supplied by the current store settings API."),
                ("Social Links", "Store -> Social Links", "Add, edit, delete and toggle active social links. Current platform choices are Facebook, Instagram, Twitter, LinkedIn and YouTube."),
                ("Social link state", "Store -> Social Links", "Set the platform and URL, then keep a link active/inactive. Only active links are included on the buyer-visible public store data."),
                ("Store users", "Store service", "List, add, update and remove store-user records where the seller account has access to the feature."),
                ("Reinstatement request", "Store service / suspended state", "View earlier requests or create a request if the store is suspended and the backend allows reinstatement."),
            ]),
            callout("Do not confuse", "Social links are public presentation links. Store users are internal access records. Changing a social link does not grant a person access to the Seller Portal.", "amber"),
        ])

    story += page("3. Seller User Manual", "Seller profile, security and account controls",
        "The personal Seller profile controls the account behind the store. It is distinct from the public Store Profile described on the previous pages.", [
            feature_table([
                ("Profile", "Profile", "View the seller’s account information and profile image."),
                ("Edit Profile", "Profile -> Edit", "Update permitted personal/account fields and upload or delete the account profile image."),
                ("Change password", "Profile -> Change Password", "Use the seller’s password-change flow. Depending on the action, a code verification flow may be used."),
                ("Email / phone verification", "Profile service", "Request and confirm account verification where the feature is available."),
                ("Profile reviews", "Profile service", "View review history made available to the seller account."),
                ("Delete account", "Profile service", "Use the protected account deletion control only after reviewing the consequence for store operations and records."),
                ("Logout", "Header/profile", "End the Seller Portal session safely, especially on shared devices."),
            ]),
        ])

    story += page("3. Seller User Manual", "Product list, search, filtering and product states",
        "Products is the catalogue workspace for a store. Sellers can browse their products, select records, search and change supported product state controls before or after editing full product data.", [
            feature_table([
                ("Product list", "Products", "View product cards/list data with image, product name, categories, pricing and status information delivered by the seller product service."),
                ("Search and filters", "Products", "Use the search field and available filter controls to narrow products. Clear filters to restore the full result set."),
                ("Categories", "Products / Add Product", "Load the current category list before creating a product; the category drives the type-specific form data."),
                ("Status / visibility", "Product controls", "Use supported status controls, including active state and mute/unmute operations where shown."),
                ("Boost shortcut", "Product controls", "Start/trigger a boost action from an eligible product, then complete campaign information in Boost Ads."),
                ("Delete", "Product detail/control", "Delete a product only after confirming. Product/order history restrictions are enforced by backend rules."),
            ]),
            callout("Admin connection", "Admin can separately inspect product records and approve/reject, toggle active visibility, mute, approve boosts or delete under admin permissions. Seller list status reflects the shared record state.", "blue"),
        ])

    story += page("3. Seller User Manual", "Create and edit products",
        "Add Product starts by selecting the category/product type, then uses the relevant product form. The project includes frames/eyeglasses, sunglasses, contact lenses, eye hygiene and accessories.", [
            feature_table([
                ("General product creation", "Products -> New Product", "Choose a category/type and continue to the matching form. The generic path also supports category selection and SKU suggestion."),
                ("Eyeglasses / frames", "Products -> New -> Eye Glasses", "Create frame/eyeglass records using the form data and image/option controls for that product type."),
                ("Sunglasses", "Products -> New -> Sun Glasses", "Create a sunglasses record with its applicable fields and product images."),
                ("Contact lenses", "Products -> New -> Contact Lenses", "Create contact lens data with basic information, price/inventory, images, options and product state."),
                ("Eye hygiene", "Products -> New -> Eye Hygiene", "Create eye hygiene products using basic information, price/inventory, images, options and state controls."),
                ("Accessories", "Products -> New -> Accessori", "Create accessory records with the same core sections adjusted for the accessory type."),
                ("Edit product", "Products -> product -> type-specific edit", "Open the correct type edit page. Update supported fields and save; the record returns to its relevant product/list detail context."),
            ]),
            Spacer(1, 3 * mm),
            callout("Core form groups", "Across the type-specific forms, the project groups fields as Basic Information, Pricing and Inventory, Images, Options and Product Status. Exact fields change by product type and selected category.", "teal"),
        ])

    story += page("3. Seller User Manual", "Product images, variants and frame sizes",
        "A product can need more than basic catalogue information. The Seller Portal has separate controls for image upload, variants and frame sizes where the product supports them.", [
            feature_table([
                ("Product images", "Create/edit form", "Upload images for the product. The upload service connects images to the product; remove or replace an image where the form provides it."),
                ("Pricing and inventory", "Create/edit form", "Set price, stock/inventory and the product’s SKU or suggested SKU as the relevant form requires."),
                ("Variants", "Product service", "Create, update, delete and set a default variant. A buyer’s selected variant is kept with the cart/order item."),
                ("Frame sizes", "Product service", "Create and manage frame-size records for the applicable product."),
            ]),
            callout("Product choices", "Variants and frame sizes keep store product choices clear. A buyer's selected variant remains linked to the cart and the resulting order item for fulfilment review.", "amber"),
        ])

    story += page("3. Seller User Manual", "Seller marketplace orders: list and detail",
        "Seller Orders contains marketplace shipments assigned to the signed-in store. It is different from Warehouse Orders, which are seller supply purchases from the warehouse channel.", [
            feature_table([
                ("Order list", "Orders", "View store shipments. Use status filter chips/controls for All, Pending, Awaiting Payment, Paid, Out for Delivery and other available statuses."),
                ("Order detail", "Orders -> shipment", "See buyer/shipment data, products, quantities, selected variants, totals, delivery summary and payment state."),
                ("Pending action", "Shipment detail", "For a pending financial shipment, accept or reject it. Acceptance opens delivery quotation inputs."),
                ("Delivery quotation", "Shipment detail", "Enter delivery fee, estimated delivery date, delivery method and optional delivery notes, then submit. The buyer receives the awaiting-payment shipment."),
                ("Payment state", "Shipment detail", "See payment/escrow data supplied for the shipment. Seller delivery progress depends on the allowed state."),
                ("Status badge", "List and detail", "Use the visible status label to understand the next allowed action. Backend rules prevent invalid transitions."),
            ]),
            callout("Key distinction", "A seller sees only its store shipment, not another store’s shipment in the same buyer checkout. Admin sees the overall order and all store shipments.", "blue"),
        ])

    story += page("3. Seller User Manual", "Seller delivery actions and order completion",
        "The standard seller delivery journey starts after acceptance and payment. Seller actions are shown only for the statuses that allow them.", [
            ProcessFlow(["Pending", "Accept and quote delivery", "Awaiting buyer payment", "Paid / Processing", "Out for delivery", "Confirm with OTP"], TEAL),
            Spacer(1, 4 * mm),
            feature_table([
                ("Mark out for delivery", "Shipment detail", "When the shipment is paid/processing, mark it Out for Delivery. This tells the buyer that delivery is underway."),
                ("Request delivery code", "Out for Delivery shipment", "Request the buyer delivery code through the supported action. The buyer sees their OTP in order details."),
                ("Confirm delivery", "Out for Delivery shipment", "Enter the six-digit buyer delivery code and confirm delivery. The backend validates the code before moving the shipment forward."),
                ("Reject/cancel path", "Pending/allowed shipment state", "Use the available rejection/cancellation action only when it appears. The record remains in order/financial history."),
                ("Seller earnings", "After confirmed delivery", "The order flow can release seller earnings through the wallet/escrow workflow. Read Wallet ledger history for the resulting entry."),
            ]),
            callout("Delivery code safety", "The buyer is instructed to give the delivery code only after products are received. Do not request or enter it before the actual handover.", "rose"),
        ])

    story += page("3. Seller User Manual", "Seller Wallet, ledger, top up and payout",
        "Seller Wallet is the finance workspace for store earnings and campaign funding. It provides balance components, finance history and two protected modal actions: Add Funds and Request Withdrawal.", [
            feature_table([
                ("Wallet summary", "Wallet", "See available balance, ad-reserved balance, ad spend, pending earnings, top ups, locked escrow, total earnings, reserved commitments and disputed earnings."),
                ("Add Funds", "Wallet -> Add Funds", "Open the funding modal, enter an amount (current form validates EUR 5-100,000) and confirm. The ledger then refreshes."),
                ("Request Withdrawal", "Wallet -> Request Withdrawal", "Enter amount, account name, account number and bank name. The form checks amount/balance and blocks invalid requests."),
                ("Transaction History", "Wallet", "Read date, type, campaign/order reference, amount, status, available balance after and ad-reserved balance after. Links can open the related boost campaign or order."),
                ("Withdrawal History", "Wallet", "See request number/date, amount, current status, payout reference and Admin notes."),
                ("Debt / dispute warning", "Wallet", "A refund debt or disputed balance warning can restrict some actions. Resolve the underlying order/finance issue rather than bypassing it."),
            ]),
            callout("Admin connection", "Admin Finance receives the seller wallet ledger and withdrawal records. When processing a withdrawal, Admin may add notes and a bank payout reference before marking the withdrawal complete.", "blue"),
        ])

    story += page("3. Seller User Manual", "Discount Campaigns (Promotions)",
        "Discount Campaigns are managed from the Promotions / Discount Campaigns area. They are distinct from coupon codes: a campaign publishes discount rules; a coupon is a code and eligibility rule set.", [
            feature_table([
                ("Campaign list", "Discount Campaigns / Promotions", "View current discount campaign records and their managed state."),
                ("Create campaign", "Discount Campaigns", "Use the campaign manager to create a discount campaign with the applicable fields and product/offer configuration provided by the form."),
                ("Edit campaign", "Campaign manager", "Open the current campaign editing control, adjust allowed data and save."),
                ("Pause/resume/delete", "Campaign controls", "Use the available lifecycle action. A paused campaign stops its active promotion behavior while keeping its management/history record."),
                ("Buyer outcome", "Buyer campaign/product pricing", "Eligible buyers see campaign information and product pricing through the commerce campaign service. Checkout calculation validates the final eligibility."),
            ]),
            callout("Practical workflow", "Create the campaign, select the eligible conditions/products in the available manager, save, then inspect buyer-facing pricing/campaign data before promoting it. Admin can supervise discount campaign activity from its Marketing area.", "teal"),
        ])

    story += page("3. Seller User Manual", "Coupons: create, manage, analyse",
        "Coupons are seller-managed codes for store, product, category or variant scopes. Dedicated pages exist for the list, create, detail and edit paths.", [
            feature_table([
                ("Coupon list", "Coupons", "View coupon cards/rows, key statistics and filters by status, type and scope."),
                ("Create coupon", "Coupons -> Create New Coupon", "Open the dedicated form. Enter the code, description, discount type/value and all rule/target data requested by the form."),
                ("Coupon scope", "Create/edit coupon", "Choose entire store, products, categories or variants. Select the applicable targets when the chosen scope needs them."),
                ("Schedule and limits", "Create/edit coupon", "Set start/end schedule, minimum order amount, total usage limit and per-buyer limit as applicable."),
                ("Eligibility switches", "Coupon detail/form", "Use public discovery, followers-only and first-paid-order-only rules when offered."),
                ("Detail and performance", "Coupons -> coupon", "Read coupon rules, target list, active state, usage history, redeemed/reserved counts, remaining allowance and schedule timezone."),
                ("Lifecycle", "List/detail", "Edit, pause/resume, activate/deactivate or archive a coupon. Archived coupon order history is preserved."),
            ]),
            callout("Buyer outcome", "At cart/checkout the buyer can validate, quote and apply a coupon. The backend rechecks dates, targets, limits and order totals at placement so a saved code is not a promise of eligibility.", "amber"),
        ])

    story += page("3. Seller User Manual", "Referral Campaigns",
        "Referral Campaigns let a store budget rewards for referred buyers and measure the result. The campaign form reserves budget from the Seller Wallet and campaigns may require Admin approval.", [
            feature_table([
                ("Campaign list", "Referral Campaigns", "View name, identifier, scope, reward, status, approval state, activation timing, budget use and performance metrics."),
                ("Create / edit", "Referral Campaigns -> Create/Edit", "Set campaign name, scope, fixed/percentage reward, optional cap, budget, minimum eligible subtotal/quantity, activation, ending time and buyer limits."),
                ("Eligible targets", "Referral Campaign form", "Choose entire store, selected products, selected categories or mixed scope. Select the matching products/categories when the form shows the pickers."),
                ("Rules", "Referral Campaign form", "Choose new-customer-only and platform stacking behavior where allowed. Choose immediate activation after approval or a scheduled start."),
                ("Campaign details", "Referral Campaigns -> campaign", "Read rules, eligible products/categories, referral reward history and performance: clicks, registrations, qualifying orders, rewards, revenue, cost, net revenue and remaining budget."),
                ("Lifecycle", "Campaign detail/list", "Pause, resume or archive a campaign. Archive releases/resolves campaign state according to backend rules; approval state is visible."),
            ]),
            callout("Money flow", "Campaign budget is reserved in the Seller Wallet. Referral rewards are only created after the configured qualifying order condition. Admin Referral Program can approve, suspend, reject or review rewards and settings.", "blue"),
        ])

    story += page("3. Seller User Manual", "Boost Ads / Boost Product campaigns",
        "Boost Ads promotes an eligible seller product through paid campaign records. It is connected directly to Seller Wallet funding and the seller’s ad-reserved/ad-spend balances.", [
            feature_table([
                ("Boost list", "Boost Ads", "View existing ad campaign records and open a campaign detail page."),
                ("Boost Product", "Boost Ads -> Boost Product", "Open the boost wizard, choose product and campaign values requested by the wizard, then create the campaign."),
                ("Add Funds", "Boost Ads -> Add Funds", "Open the compact seller-wallet funding sheet and add a permitted EUR amount before/while preparing paid boost activity."),
                ("Campaign detail", "Boost Ads -> campaign", "Review the campaign’s product, state and finance/performance information supplied by the ad service."),
                ("Product boost action", "Products", "Eligible product controls can direct the seller into a boost action using that product as the campaign starting point."),
                ("Admin review", "Admin -> Boost Campaigns", "Admin can inspect campaign records and approve related boost work under its moderation permissions."),
            ]),
            callout("Result", "Ad spending appears in the Seller Wallet ledger with a boost-campaign reference. The platform also records marketing/ad data used in its Admin dashboard and CRM read-only overview.", "teal"),
        ])

    story += page("3. Seller User Manual", "Banners and store announcements",
        "Banners and announcements are two different communication tools. A banner is a visual/placement record; an announcement is a timed buyer-facing text update.", [
            feature_table([
                ("Banners", "Banners", "List seller banner records, create, edit, delete, toggle active state and reorder banners. Upload/configure images and placement data through the banner form."),
                ("Banner ordering", "Banners", "Use the reorder control to arrange active banner sequence. Buyers receive public banners by placement through the public/commerce campaign services."),
                ("Announcements list", "Announcements", "View announcement records and filter/time fields. Open a record for its message and lifecycle controls."),
                ("New announcement", "Announcements -> New", "Create a timed store update with title, message, start date and end date. Save makes it available according to its active/schedule state."),
                ("Announcement detail", "Announcements -> announcement", "Read full message, start/end dates and current active/draft state. Edit, activate/pause or delete using the available buttons."),
                ("Admin banner oversight", "Admin -> Store Banners", "Admin can list, inspect, approve/reject, toggle active status or delete store banner records."),
            ]),
            callout("Date fields", "Announcements and campaign features use date/date-time controls in the current interfaces. Use the calendar/date input and confirm the displayed schedule before saving.", "amber"),
        ])

    story += page("3. Seller User Manual", "Warehouse: supplier catalogue and cart",
        "Warehouse is a seller supply-purchase channel. It is not the same as the buyer marketplace product list or a buyer order. Sellers use it to purchase warehouse products and see their warehouse cart/order records.", [
            feature_table([
                ("Warehouse catalogue", "Warehouse", "View warehouse products and use available product/category/filter controls. Open a product to see warehouse-specific details."),
                ("Warehouse product detail", "Warehouse -> product", "Review the warehouse item’s available data and use the purchase/cart action where permitted."),
                ("Warehouse cart", "Warehouse -> Cart", "Add, update quantity or remove warehouse items. The cart reflects the seller’s current supply order selection."),
                ("Checkout warehouse cart", "Warehouse Cart", "Submit a warehouse cart through the warehouse checkout action. The backend creates a separate seller warehouse order."),
                ("Warehouse orders", "Warehouse -> Orders", "View warehouse order history and open the detail for a specific seller warehouse order."),
                ("Admin Warehouse", "Admin -> Warehouse", "Admin manages warehouse dashboard/product/category/order records, including warehouse order status data."),
            ]),
            callout("Do not confuse", "Marketplace Orders are buyer purchases from a seller store. Warehouse Orders are seller purchases from the platform warehouse. They have different lists, carts and order records.", "rose"),
        ])

    story += page("3. Seller User Manual", "Seller messages, buyer chat and Admin chat",
        "Messages centralises conversations. The project provides a buyer-store conversation channel and a separate seller-to-Admin channel.", [
            feature_table([
                ("Buyer conversations", "Messages", "Open buyer-store conversations, load message history and send a message. These are the conversations buyers start from a public store or Buyer App."),
                ("Customer details", "Message list/detail", "Conversation data includes the customer/store context supplied by the chat service. Use it to identify the request before replying."),
                ("Admin conversations", "Messages", "Open seller-Admin conversation records and exchange messages through the dedicated seller-admin chat API."),
                ("Attachments", "Chat/support forms where enabled", "Use the attachment selection/upload path only where present. Upload success is part of the message/ticket workflow; errors are shown to the sender."),
                ("Unread state", "Header/sidebar/message category", "Unread counts and category state are provided by the notification/sidebar service so sellers can see communication that needs attention."),
            ]),
            callout("Connection", "Admin Messages can start or open a store conversation, load its history and send replies. This makes seller support communication auditable without mixing it with a buyer-chat thread.", "blue"),
        ])

    story += page("3. Seller User Manual", "Seller notifications, reviews, support and guide",
        "Seller operational alerts appear in Notifications and the portal can expose unread counters. Formal Support Tickets remain separate from product/store reviews and order messages.", [
            feature_table([
                ("Notifications", "Notifications / header", "View notification list, unread count and read state. Use mark-read or mark-all-read controls; relevant notifications can provide a destination context."),
                ("Reviews", "Profile/store service", "View review-related data available to the seller. Buyer reviews are submitted only after eligible completed purchases."),
                ("Support Tickets", "Support service", "List tickets, create a ticket, open a ticket, reply, close or reopen it. Use attachment download/upload where the ticket record provides it."),
                ("Help / Guide", "Guide route when exposed", "Open seller guidance content in the project. Keep business operations aligned with platform policies and approval rules."),
                ("Live refresh", "Portal services", "Notifications, lists and operational values refresh after successful actions and through the project’s live refresh patterns."),
            ]),
        ])

    story += page("3. Seller User Manual", "Seller analytics and performance reading",
        "Seller Analytics is the performance screen for turning activity into practical store decisions. It is separate from the dashboard quick view and from the Admin marketplace-wide analytics.", [
            feature_table([
                ("Monthly trends", "Analytics", "Review monthly performance trend charts/data supplied by the seller analytics service."),
                ("Order status breakdown", "Analytics", "See how orders are distributed by operational status. Use it to identify outstanding delivery/payment work."),
                ("Recent orders", "Analytics", "Review a current order slice and open the operational Orders area when action is needed."),
                ("Store overview/stats", "Store / Dashboard", "Use store stats, dashboard data and follower information for a focused store view."),
                ("Campaign performance", "Referral / Coupon / Boost details", "Read campaign-specific figures in the relevant feature rather than assuming all marketing figures are identical."),
            ]),
            callout("Use the right view", "Dashboard is for immediate awareness; Analytics is for trend/status review; Wallet is for money; campaign detail screens are for a campaign’s exact metrics and lifecycle.", "teal"),
        ])

    # Admin
    story += page("4. Admin User Manual", "Admin access and dashboard",
        "Admin is the platform oversight role. Its portal is organised by People, Operations, Marketing, Communication, Finance and System, with live count badges for items needing attention.", [
            feature_table([
                ("Admin login", "Admin Login", "Sign in using an Admin account. The backend uses admin middleware/abilities to protect all administrative actions."),
                ("Dashboard", "Dashboard", "View platform overview, date range selection, revenue performance, order status, monthly orders, warehouse overview, revenue sources, best sellers, recent activity and insights."),
                ("Export", "Dashboard where available", "Export dashboard-related data when the current action is offered."),
                ("Live badges", "Admin sidebar", "See counts for finance withdrawals, referrals, seller/product approvals, boost campaigns, orders, messages, support, reports, banners and discount campaigns."),
                ("Admin notifications/toasts", "Portal UI", "Receive operation feedback and notification state in the Admin experience after actions or incoming attention items."),
            ]),
            callout("Admin responsibility", "Admin should use management actions to enforce policy and correct workflow exceptions, not to replace normal Buyer/Seller order steps. Every action should have a business reason.", "rose"),
        ])

    story += page("4. Admin User Manual", "People: users and sellers",
        "The People area separates general user management from seller/store approval. It is where Admin controls account access and reviews seller identity/state.", [
            feature_table([
                ("Users list", "People -> Users", "Search, filter and view user records. The list supports user/admin management fields exposed by the current service."),
                ("Create / edit user", "Users", "Create, update or open a user record with permitted account details."),
                ("Block / unblock", "Users / user detail", "Change a user’s blocked state when policy requires it. Use the account detail to verify the correct person first."),
                ("Delete user", "Users", "Delete only when the operation is explicitly appropriate. Related historical commerce records may be retained by backend business rules."),
                ("Sellers list", "People -> Sellers", "Search seller records and open full seller/store detail data."),
                ("Approve / reject seller", "Sellers / seller detail", "Approve a qualified seller or reject an application. This connects to Seller pending-approval/suspended access states."),
            ]),
        ])

    story += page("4. Admin User Manual", "Operations: products and categories",
        "Admin has a platform-wide product and category view. Seller product data is managed by the store, but Admin controls moderation and catalogue governance.", [
            feature_table([
                ("Products list", "Operations -> Products", "View marketplace products and open a product detail record."),
                ("Product moderation", "Product detail/list actions", "Approve or reject a product, control active visibility, mute/unmute, approve boost work or delete when the current Admin ability permits it."),
                ("Product detail", "Products -> product", "Inspect the product’s shared data before making a moderation decision."),
                ("Categories", "Operations -> Categories", "Search the category tree and create, edit or delete category data. The current form includes category content such as the Italian title field where configured."),
                ("Category impact", "Categories -> Seller products", "A category affects Seller product creation and buyer category browsing. Use careful changes because category configuration can affect product options."),
            ]),
            callout("Workflow", "Seller creates/edits a product -> Admin reviews/controls the record -> active catalogue data becomes available to buyers under the relevant visibility rules.", "teal"),
        ])

    story += page("4. Admin User Manual", "Operations: marketplace orders",
        "Admin Orders provides the complete buyer order view and its store shipments. It is the authoritative oversight page for payment, delivery, shipment items and permitted intervention.", [
            feature_table([
                ("Orders list", "Operations -> Orders", "Search by order reference and filter by payment status: pending, paid, failed, refunded or cancelled. Open an order for full detail."),
                ("Order detail", "Orders -> order", "See buyer information, order totals, store shipments, address snapshots, delivery information, item lines, selected variant, lens configuration and prescription data where present."),
                ("Payment / refund data", "Order detail", "Read payment ID, method, amount, transaction, refund transaction and refund reason where those records exist."),
                ("Shipment action", "Order detail", "Choose an allowed status action. The portal exposes choices based on current shipment/payment state, such as processing, out for delivery, delivered, refunded, disputed or cancelled."),
                ("Delivery code", "Order detail -> delivery action", "When Admin marks an allowed shipment delivered, enter the buyer delivery code. This respects the same delivery confirmation concept used by the seller."),
            ]),
            callout("Safe handling", "Always open the order detail before changing a status. The product/financial history shown there helps Admin decide whether an exception should be processed, refunded or disputed.", "amber"),
        ])

    story += page("4. Admin User Manual", "Operations: Warehouse",
        "Admin Warehouse is the management side of the seller supply channel. It is separate from the buyer marketplace catalogue and buyer checkout flow.", [
            feature_table([
                ("Warehouse dashboard", "Operations -> Warehouse", "Review warehouse overview data."),
                ("Warehouse products", "Warehouse", "Create, update, inspect and manage warehouse product records."),
                ("Warehouse categories", "Warehouse", "Create, update and manage warehouse-specific category records."),
                ("Warehouse orders", "Warehouse", "Review seller warehouse orders, open order detail and update permitted warehouse-order statuses."),
                ("Seller use", "Seller -> Warehouse", "Sellers browse warehouse products, add items to a warehouse cart and submit warehouse checkout. Admin works on the resulting supply order record."),
            ]),
        ])

    story += page("4. Admin User Manual", "Marketing: boost, discount campaigns and banners",
        "Admin Marketing supervises seller promotional activity at marketplace level. It does not replace a seller’s campaign setup screen; it is the approval, review and platform management layer.", [
            feature_table([
                ("Boost Campaigns", "Marketing -> Boost Campaigns", "View seller ad/boost campaign records and use available approval/management controls."),
                ("Discount Campaigns", "Marketing -> Discount Campaigns", "View and supervise seller discount campaign activity and data supplied by the campaign feature."),
                ("Store Banners", "Marketing -> Store Banners", "List banner records, open detail, approve/reject, toggle active state or delete a banner."),
                ("Campaign relationships", "Seller marketing modules", "Seller discount/boost/referral/coupon work can affect buyer-facing offers, marketing placement and wallet/ledger activity."),
                ("Ad performance", "Dashboard / CRM data", "Platform ad revenue/performance contributes to platform reporting. The CRM read-only integration exposes an ads performance resource."),
            ]),
            callout("Banner status", "A seller can create and arrange banners, but Admin is able to approve/reject and control active state at the marketplace level. Do not promise a buyer display until the record is approved/active where that rule applies.", "blue"),
        ])

    story += page("4. Admin User Manual", "Marketing: Coupons",
        "Admin Coupons is the platform review view for seller coupons. It lets Admin monitor use and audit history while sellers create the actual coupon rules for their store.", [
            feature_table([
                ("Coupon list", "Marketing -> Coupons", "Search/filter coupon records and select a coupon to inspect its summary."),
                ("Coupon detail", "Coupons", "Read store association, code, status and coupon data exposed by the admin service."),
                ("Usage and audit", "Coupon detail", "Review usage records and audit history to understand how/when a coupon was changed or used."),
                ("Enable / disable", "Coupons", "Control coupon availability using enable, disable or toggle actions. Seller may also pause/resume/archival-manage its own coupon."),
                ("Delete", "Coupons", "Delete only after reviewing uses and audit information. The seller coupon detail retains protected commerce history according to backend behavior."),
            ]),
        ])

    story += page("4. Admin User Manual", "Finance: wallets, revenue and withdrawals",
        "Marketplace Finance brings together seller wallet balances, seller ledger entries, platform revenue, buyer transactions and seller payout requests.", [
            feature_table([
                ("Seller wallets", "Finance -> Seller Wallets", "See available, pending, reserved, ad-reserved, ad-spend, top-up, disputed, debt and total earnings balances for a seller wallet."),
                ("Seller transactions", "Finance -> Seller Ledger", "Review ledger rows, references to a campaign/shipment/withdrawal, payment method metadata and before/after balance changes."),
                ("Platform revenue", "Finance -> Platform Revenue", "Review platform ledger records connected to marketplace financial activity."),
                ("Buyer transactions", "Finance -> Buyer Wallet Transactions", "Filter by buyer ID and inspect buyer wallet transaction records."),
                ("Withdrawals", "Finance -> Withdrawals", "Review bank details, amount, status, payout reference and notes. Apply allowed withdrawal status updates."),
                ("Complete payout", "Withdrawal action", "When choosing Completed, enter required notes and bank payout reference. This provides a traceable result for the seller."),
            ]),
            callout("Finance discipline", "Wallet balances change from real workflow entries: delivery/earnings, funding, campaign spend, withdrawals, refunds or reversals. Use ledger information before changing a payout state.", "rose"),
        ])

    story += page("4. Admin User Manual", "Finance: referral program",
        "Admin controls global referral settings and can supervise seller referral campaigns and referral rewards.", [
            feature_table([
                ("Referral settings", "Finance -> Referral Program", "Configure platform referral enablement, reward type/amount, maximum reward, minimum order, attribution days, waiting days, monthly and per-buyer limits."),
                ("Referral safeguards", "Referral settings", "Control seller approval requirement, existing-buyer policy, referral stacking and email/phone verification requirements."),
                ("Referral campaigns", "Referral Program", "Review seller campaign records and use approval, suspension or rejection actions where available."),
                ("Referral rewards", "Referral Program", "Review conversion/reward records and approve, suspend, reject or reverse rewards under the available lifecycle action."),
                ("Referral audit/export", "Referral Program", "Read audit entries and export results when the feature is offered."),
            ]),
        ])

    story += page("4. Admin User Manual", "Communication: Messages and Support",
        "Admin can communicate with stores and process formal support tickets. Use the right channel so conversation history stays meaningful.", [
            feature_table([
                ("Admin Messages", "Communication -> Messages", "Start/open a store conversation, load conversation history and send a message. The seller sees this in the seller-admin chat channel."),
                ("Store context", "Message start/detail", "Select or use the correct store context before sending. This avoids mixing a question into the wrong seller conversation."),
                ("Support list", "Communication -> Support", "View support ticket list and open a ticket for its details."),
                ("Support ticket", "Support -> ticket", "Read ticket messages/attachments, send a reply and update ticket status/priority through the available controls."),
                ("Attachments", "Support ticket", "Use attachment download/support upload paths where provided. Files remain tied to the formal support record."),
            ]),
            callout("Channel choice", "Use Admin Messages for store operational communication. Use Support for a formal help record that needs ticket status, reply history and attachment handling.", "teal"),
        ])

    story += page("4. Admin User Manual", "Communication: Store Reports and reinstatements",
        "Store Reports is the moderation path for buyer reports and store-related review work. It also contains the reinstatement request list for sellers whose stores need a decision.", [
            feature_table([
                ("Report summary", "Communication -> Store Reports", "Review overall report workload and open individual reports."),
                ("Report detail", "Store Reports -> report", "Read the report information and related store context before choosing an action."),
                ("Report lifecycle", "Report detail", "Update report status and use available warn, suspend or remove actions when policy and evidence support it."),
                ("Reinstatement", "Store Reports", "Review seller store reinstatement requests and record the decision. The Seller Portal shows the result through the store status workflow."),
                ("Store enforcement", "Reports / Sellers", "Coordinate a store status action with seller approval and reports. Do not use a punitive action without the record/policy basis."),
            ]),
        ])

    story += page("4. Admin User Manual", "Analytics, activity logs and system settings",
        "The Admin Portal has a marketplace-wide analytics view, auditable activity log and a settings area for common platform configuration.", [
            feature_table([
                ("Analytics", "Communication -> Analytics", "View revenue, user growth, sales trends and top products by views."),
                ("Activity Logs", "Communication -> Activity Logs", "Review recorded Admin/system actions for accountability and troubleshooting."),
                ("Settings", "System -> Settings", "Read/update platform settings. Current settings include platform name and platform email, with data held in platform settings storage."),
                ("Date range", "Dashboard / analytics controls", "Use the available date range selector before interpreting charts and current-period figures."),
                ("Permissions", "Backend abilities", "Admin endpoints are protected by specific abilities. If an action is absent, use an account with the relevant permission rather than changing application data outside the portal."),
            ]),
        ])

    # Cross role workflows
    story += page("5. Complete Workflows", "End-to-end order workflow",
        "This is the normal buyer-to-seller order journey found in the current project. The precise next action is driven by shipment/payment state, so the platform blocks invalid jumps.", [
            ProcessFlow(["Buyer configures item", "Adds to cart", "Places checkout order", "Seller accepts and quotes", "Buyer pays shipment", "Seller delivers with OTP"], TEAL),
            Spacer(1, 4 * mm),
            steps([
                "Buyer browses a store/product, chooses any required variant, lens or prescription information, then adds the configured item to the cart.",
                "Buyer selects an address, reviews discounts/coupon eligibility and places checkout. The system creates an overall order and one store shipment per store.",
                "Seller opens the pending shipment. The seller accepts/rejects it. On acceptance, the seller records delivery fee, estimated date, method and notes.",
                "The shipment moves to Awaiting Payment. Buyer opens the order/shipment and completes the payment action for that shipment.",
                "After payment, Seller progresses shipment to Out for Delivery, requests the delivery code and confirms the six-digit code after actual handover.",
                "The buyer sees Delivered, can review products/store, and the financial workflow can release seller earnings. Admin can inspect every layer and handle allowed exception/refund/dispute actions.",
            ]),
            callout("Multi-store checkout", "Each seller progresses only its own shipment. One shipment can be delivered while another is still awaiting payment or out for delivery. The buyer-level order groups them for convenience.", "blue"),
        ])

    story += page("5. Complete Workflows", "Order status and responsibility map",
        "Statuses are displayed in different role views, but the underlying store shipment is shared. The table shows the normal owner of each step.", [
            feature_table([
                ("Pending", "Seller Orders / Buyer Orders", "Seller reviews the new shipment and can accept/reject according to available controls."),
                ("Awaiting Payment", "Buyer Order Detail", "Buyer reviews seller delivery quote and completes shipment payment."),
                ("Paid / Processing", "Seller Order Detail", "Seller prepares the shipment. Admin can see the payment/financial data and permitted exception actions."),
                ("Out for Delivery", "Seller and Buyer Order Detail", "Seller marks the shipment on the way and requests the buyer delivery OTP."),
                ("Delivered", "All role order views", "Seller confirms code after handover; buyer can review; finance history reflects the resolved fulfilment outcome."),
                ("Cancelled / Refunded / Disputed", "Allowed role/administrative action", "Use the current permitted control and review payment/refund/dispute context. Admin has the broadest oversight/action path."),
            ]),
            callout("Never bypass the state", "A visible action is intentionally limited by the current shipment/payment state. For example, a delivery code is only meaningful when a shipment is out for delivery.", "rose"),
        ])

    story += page("5. Complete Workflows", "Wallet, payout and campaign money flow",
        "The project has buyer wallet records and a more detailed seller wallet ledger. These are linked to different financial reasons but both are visible to Admin Finance.", [
            ProcessFlow(["Seller adds funds", "Funds reserved for boost/referral", "Campaign spends or rewards", "Ledger records result", "Admin audits/handles payouts"], BLUE),
            Spacer(1, 4 * mm),
            feature_table([
                ("Buyer top up", "Buyer Wallet", "Buyer funds the personal wallet; balance and transaction history update. Current UI enforces the displayed minimum."),
                ("Buyer withdrawal", "Buyer Wallet", "Buyer submits bank details and amount; system validates balance/minimum and records the request/transaction."),
                ("Seller funding", "Seller Wallet / Boost Ads", "Seller adds funds through wallet or Boost Ads funding. The ledger includes funding and ad campaign references."),
                ("Seller earning", "Delivery completion", "Confirmed delivery can release earnings from the order/escrow process to the seller financial position."),
                ("Referral budget", "Seller Referral Campaign", "Campaign creation reserves seller wallet budget. Reward history and refund/reversal logic flow through controlled records."),
                ("Seller payout", "Seller Wallet -> Request Withdrawal", "Seller submits bank details/amount. Admin reviews the request and can add notes and a payout reference on completion."),
            ]),
        ])

    story += page("5. Complete Workflows", "Discounts, coupons, referrals and boosts",
        "Marketing tools each serve a different job. Use the one that matches the business goal, then inspect the exact campaign/coupon detail rather than assuming they work the same way.", [
            feature_table([
                ("Discount campaign", "Seller Promotions", "Creates product promotion rules. Buyer sees campaign content/eligible pricing; Admin sees marketing oversight."),
                ("Coupon", "Seller Coupons", "Creates a code with discount, scope, schedule, eligibility and usage limits. Buyer validates/applies the code in checkout."),
                ("Referral campaign", "Seller Referral Campaigns", "Offers a referral reward with a reserved seller budget, eligible targets and performance metrics. Admin approval/settings can control it."),
                ("Boost ad", "Seller Boost Ads", "Funds/promotes an eligible product through an ad campaign. Ad spend is tracked in Seller Wallet and platform reporting."),
                ("Banner", "Seller Banners", "Places visual seller marketing content subject to active/approval rules; buyers receive public banner placements."),
                ("Announcement", "Seller Announcements", "Publishes a timed text update for store buyers rather than a discount calculation."),
            ]),
            callout("Checkout truth", "Buyer-facing pricing is always recalculated by the backend for the actual cart/order. A campaign card, coupon code or referral link alone does not override validation, limits, dates or payment outcome.", "amber"),
        ])

    story += page("5. Complete Workflows", "Messages, support and notifications",
        "The platform uses three related but different ways to communicate. Selecting the right one improves history, ownership and resolution tracking.", [
            feature_table([
                ("Buyer-store chat", "Buyer Store / Seller Messages", "A shopper asks a store about products/orders. Seller replies in the buyer conversation. It is informal operational messaging."),
                ("Seller-Admin chat", "Seller Messages / Admin Messages", "A seller and Admin discuss store/platform matters in a dedicated conversation with its own history."),
                ("Support ticket", "Buyer/Seller Support / Admin Support", "A formal help record. It has ticket list/detail, replies, status/priority controls and attachment handling."),
                ("Notification", "Role header / Notifications", "An alert about an event or record. It has unread state and may navigate the recipient toward the related order/message/record."),
            ]),
            ProcessFlow(["System event", "Notification created", "Unread badge updates", "Recipient opens alert", "Relevant record opens / state becomes read"], TEAL),
            Spacer(1, 3 * mm),
            callout("Attachment handling", "Where chat or ticket file upload is available, wait for upload success before assuming a file was sent. The record should show the attachment in its own conversation/ticket history.", "blue"),
        ])

    story += page("5. Complete Workflows", "Store moderation and public visibility",
        "Seller content is not isolated. Public buyer pages reflect store/product/banner data that has passed the platform’s relevant live/active/approval rules.", [
            ProcessFlow(["Seller creates or updates", "Record is validated", "Admin reviews where required", "Record becomes active/public", "Buyer can browse or use it"], BLUE),
            Spacer(1, 4 * mm),
            feature_table([
                ("Seller account", "Admin Sellers", "Admin approval/rejection affects whether seller operations can proceed."),
                ("Product", "Admin Products", "Admin product moderation and active/mute controls affect buyer catalogue availability."),
                ("Banner", "Admin Store Banners", "Admin can approve/reject/toggle/delete a seller banner. Buyer banners use active public placement data."),
                ("Coupon/campaign", "Admin Marketing", "Admin sees platform review lists and may control availability depending on the feature/permission."),
                ("Store report", "Admin Store Reports", "Buyer reports lead to investigation and possible warning, suspension or removal; seller reinstatement requests are handled here."),
            ]),
        ])

    story += page("6. Feature-to-Feature Relationships", "Feature relationship map",
        "This quick reference helps a client understand why a change in one area may appear elsewhere. It is intentionally practical, not a technical database diagram.", [
            feature_table([
                ("Store images/profile", "Seller Store", "Changes Buyer public store page and may change the visual store context in products/conversations."),
                ("Product variants", "Seller Products", "Changes the available buyer choice and keeps the selected variant on cart/order items."),
                ("Product stock/status", "Seller Products / Inventory", "Changes seller list visibility and can affect Buyer availability; low-stock data is available to the seller."),
                ("Order delivery quote", "Seller Order Detail", "Changes Buyer shipment payment/delivery information and can unlock the buyer payment step."),
                ("Delivery confirmation", "Seller Order Detail", "Changes buyer status/review eligibility and seller earnings/finance workflow."),
                ("Coupon/referral/boost", "Seller Marketing / Wallet", "Changes campaign/offer data and creates finance/ledger effects that Admin can audit."),
                ("Buyer report/support", "Buyer -> Admin", "Creates a formal Admin queue rather than changing store/product data directly."),
            ]),
        ])

    story += page("7. Important System Processes", "Validation, feedback and safe operations",
        "The project uses client forms plus backend validation. A button being visible does not guarantee the action will succeed if a required field, permission or state condition is missing.", [
            feature_table([
                ("Required fields", "Forms", "Complete fields marked required. The client highlights invalid values and the backend returns a message if a rule is not met."),
                ("Amounts", "Wallet/campaign/coupon/order forms", "Use valid numeric amounts within the displayed min/max. Examples: current buyer/seller funding uses a displayed minimum; seller payout checks available balance."),
                ("Dates", "Campaigns/coupons/announcements/orders", "Use the supplied date/date-time picker/input. Check start/end order and local display time before saving."),
                ("Uploads", "Product/store/banner/message/support", "Wait for upload completion and check error/success feedback. An image/file must be uploaded to be included in the saved record."),
                ("Status actions", "Orders/campaigns/coupons", "Only choose a transition listed for the current state. Backend rules prevent a user from forcing an invalid delivery/payment/campaign step."),
                ("Success/error feedback", "All modules", "Read green success or red error messages before moving away. Successful actions reload the relevant record/list so the client can verify the result."),
            ]),
        ])

    story += page("7. Important System Processes", "Common filters, search and modals",
        "Small controls are important because they help people work safely with large lists. The exact options depend on the module, but they follow consistent patterns.", [
            feature_table([
                ("Search field", "Products, Stores, Orders, Users, Categories, Coupons", "Enter a name, code, reference or applicable text. Apply/submit the search where a separate Search button appears."),
                ("Status filter", "Orders, Coupons, campaigns, management queues", "Choose a status to show only matching records. Selected state is visually indicated; clear/reset returns to all records."),
                ("Type/scope filter", "Coupons/products/marketing", "Narrow results by type, category/scope or similar data values supplied by that module."),
                ("Date/date-time input", "Scheduled records", "Select the schedule boundary. On a detail screen, read the formatted stored time to confirm it saved correctly."),
                ("Modal/bottom sheet", "Wallet funding/withdrawal and compact actions", "Enter a focused amount or small form, cancel to keep the prior state, or confirm to submit. Long multi-field management forms use full pages where the current portal provides them."),
                ("Confirm dialog", "Delete/archive/close", "Confirm only after reviewing the current record. Cancel leaves it unchanged."),
            ]),
        ])

    story += page("7. Important System Processes", "What happens when a record is removed or paused",
        "The portal distinguishes between immediate public availability and retained operational history. This is especially important for commerce, campaign and finance records.", [
            card_grid([
                ("Pause", "Normally stops a coupon, referral campaign, announcement or similar record from being active while retaining it for future resumption/history."),
                ("Deactivate / toggle", "Changes the active/public state of a supported record such as a social link, coupon, banner or announcement."),
                ("Archive", "Retires a campaign/coupon workflow while preserving the records needed for usage/order history. Coupon detail specifically notes that existing history is preserved."),
                ("Delete", "Removes a record through the service where allowed. Product, user and marketing deletions may still leave protected historical references under backend rules."),
                ("Close / reopen ticket", "Changes formal support ticket state. A closed ticket can be reopened where the feature allows it."),
                ("Refund / reverse", "Works through Admin/order/referral finance paths. It should leave transaction/ledger trail rather than merely changing a screen label."),
            ]),
            Spacer(1, 4 * mm),
            callout("Client policy", "Before staff delete, archive, pause or refund, make sure they know which action is reversible, which affects public visibility and which enters finance or audit history.", "rose"),
        ])

    story += page("8. Other Project Components", "Read-only CRM integration",
        "The Laravel project includes a protected CRM API integration. It is an integration layer, not a daily Buyer/Seller/Admin portal screen.", [
            feature_table([
                ("Purpose", "Laravel CRM routes", "Provides approved external CRM consumers with a read-only view of selected platform data using an API key and ability checks."),
                ("Overview", "CRM Overview", "Provides aggregated marketplace overview data."),
                ("Users and sellers", "CRM resources", "Provides read-only user/seller records for permitted CRM use."),
                ("Products and orders", "CRM resources", "Provides product list/detail and order list/detail information for permitted CRM use."),
                ("Warehouse", "CRM resources", "Provides warehouse overview, product and order information."),
                ("Ads and leads", "CRM resources", "Provides ads performance and leads-style data. The code notes that the platform does not keep a separate dedicated leads entity."),
                ("Seller subscriptions", "Seller API capability", "The backend exposes plans, current subscription, subscribe, cancel and feature-check endpoints. The current main Seller Portal navigation does not expose a visible Subscription page, so treat it as a configured/API capability until a client screen is enabled."),
            ]),
            callout("Security", "This integration is server protected and read-only. It should be configured only by authorised technical staff; it is not a user-facing substitute for the Admin Portal.", "rose"),
        ])

    story += page("9. Quick Reference", "Buyer navigation index",
        "Use this index to find Buyer features quickly. Website and app labels can differ slightly, but the service/data is shared.", [
            feature_table([
                ("Discover", "Home / Shop / Categories / Search", "Products, categories, stores, campaigns and banners."),
                ("Product decision", "Product detail", "Images, price, store, variants, prescription/lens choices, reviews and add-to-cart."),
                ("Purchase", "Cart -> Checkout", "Cart management, address, coupon validation, order placement and payment after seller review."),
                ("Track", "My Orders", "Order and store shipments, delivery data/code, payment and reviews."),
                ("Account", "Profile / Account tab", "Profile, addresses, wallet, points, wishlist, followed stores, reviews, referrals and password/security."),
                ("Talk / get help", "Store chat / Support / Help", "Store conversation, formal ticket, policies and practical help."),
                ("Stay informed", "Notifications", "Unread count, list and read-state actions."),
            ]),
        ])

    story += page("9. Quick Reference", "Seller navigation index",
        "Use this index to find Seller functions quickly. The desktop sidebar exposes the broadest current set; mobile navigation focuses on frequent operations.", [
            feature_table([
                ("Operate", "Dashboard / Store / Analytics", "Store overview, profile, settings, follower/stats and performance."),
                ("Sell", "Products / Orders", "Product catalogue/type-specific forms, variants, marketplace shipments and delivery actions."),
                ("Market", "Discount Campaigns / Coupons / Referral / Boost / Banners / Announcements", "Promotions, coupon codes, referral rewards, paid boosts and buyer-facing store communications."),
                ("Supply", "Warehouse / Warehouse Cart / Warehouse Orders", "Seller supply catalogue and separate warehouse purchase workflow."),
                ("Money", "Wallet", "Balances, ledger, add funds and request withdrawal."),
                ("Communicate", "Messages / Notifications / Support", "Buyer chat, Admin chat, alerts and support tickets."),
            ]),
        ])

    story += page("9. Quick Reference", "Admin navigation index",
        "Use this index to find Admin functions quickly. Actions are availability/permission dependent.", [
            feature_table([
                ("Dashboard", "Dashboard", "Marketplace overview, performance, trends, operational insight and live counts."),
                ("People", "Users / Sellers", "Accounts, blocking, seller review and approval."),
                ("Operations", "Products / Orders / Warehouse / Categories", "Catalogue moderation, all-order view, supply channel and category governance."),
                ("Marketing", "Boost / Discount Campaigns / Store Banners / Coupons", "Marketing oversight, approval/visibility and coupon audit."),
                ("Communication", "Messages / Support / Store Reports / Analytics / Activity Logs", "Seller communication, formal support, moderation, reports and audit."),
                ("Finance", "Marketplace Finance / Referral Program", "Wallets, ledger, buyer transactions, withdrawals and referral governance."),
                ("System", "Settings", "Platform name/email and system configuration data."),
            ]),
        ])

    story += page("10. Glossary", "Plain-language glossary",
        "These short definitions match the terms used across the project and help non-technical readers follow the workflow.", [
            feature_table([
                ("Buyer order", "Checkout record", "The overall order created by the buyer. It can contain shipments from one or more seller stores."),
                ("Store shipment", "Seller order", "The portion of a buyer order owned and fulfilled by one store. It has its own payment, delivery fee, status and items."),
                ("Escrow", "Order finance state", "A protected financial state used by the order workflow. It helps ensure seller earnings are released at the correct delivery point."),
                ("Wallet ledger", "Seller finance history", "A traceable list of changes such as earnings, funding, ad spend, withdrawals, reversals and balance-after values."),
                ("Campaign", "Marketing record", "A scheduled/rule-based promotion such as discount, referral or boost activity."),
                ("Coupon", "Checkout code", "A discount rule with code, scope, date and usage eligibility."),
                ("Warehouse order", "Seller supply order", "A seller purchase from the platform warehouse, separate from a buyer marketplace order."),
                ("Notification", "Role alert", "A read/unread message about an event with an optional related destination."),
            ]),
        ])

    story += page("11. Client Handover", "Recommended operating routine",
        "The platform is most reliable when staff use clear routines for day-to-day operations and exception handling.", [
            card_grid([
                ("Daily seller routine", "Check Dashboard/Notifications, answer Messages, inspect pending orders, set delivery quotes promptly, fulfil paid shipments and review low stock."),
                ("Weekly seller routine", "Review Wallet ledger, campaign results, product/stock condition, store content, coupon schedules and referral/boost performance."),
                ("Daily admin routine", "Check live badges, pending sellers/products/campaigns, open support/reports, examine operational order exceptions and payout queue."),
                ("Weekly admin routine", "Review finance/revenue, analytics, activity logs, referral/campaign audit, category/store quality and platform settings."),
                ("Buyer support routine", "Use store chat for store questions. Use order records for payment/delivery questions. Use Support Tickets for formal unresolved platform issues."),
                ("Before campaign launch", "Check date/time, budget, eligible products/categories, stock, coupon/referral rules, buyer-facing wording and required Admin approval."),
            ]),
            Spacer(1, 5 * mm),
            callout("Final reminder", "This manual is a guide to the current project implementation. Keep it alongside the client’s operating policy, payment/dispute policy and any future release notes that change a workflow.", "teal"),
        ])

    # Remove trailing PageBreak to avoid blank page.
    if isinstance(story[-1], PageBreak):
        story.pop()
    doc.build(story)
    print(f"Created: {OUTPUT}")


if __name__ == "__main__":
    build_manual()
