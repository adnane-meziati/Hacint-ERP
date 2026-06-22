"""Génération PDF des documents comptables (ReportLab).

Gabarit aligné sur le modèle « Purchase Order » HACINT :
- logo en haut à gauche, titre + numéro + date en haut à droite ;
- bloc société sous le logo, encadré destinataire à droite ;
- tableau  # | Article & Désignation | Qté | Unité | P.U HT | Remise % | Total HT ;
- pied de page légal sur CHAQUE page (raison sociale + adresse,
  RC / IF / TP / ICE, téléphone / e-mail / site web) avec pagination « x / y ».

Les mentions obligatoires de l'art. 145 du CGI sont conservées
(identifiants légaux, détail TVA par taux, montant arrêté en lettres).
"""
import os
from decimal import Decimal
from io import BytesIO

TITRES = {
    'devis':         'Devis',
    'facture':       'Facture',
    'avoir':         'Avoir',
    'facture_achat': "Facture d'achat",
    'avoir_achat':   "Avoir d'achat",
}

# Logo par défaut embarqué avec l'application (extrait du modèle HACINT)
DEFAULT_LOGO = os.path.join(os.path.dirname(__file__), 'assets', 'logo.jpg')


def _fmt(montant):
    """1234567.5 → '1 234 567,50' (format marocain/français)."""
    s = f'{Decimal(montant):,.2f}'
    return s.replace(',', ' ').replace('.', ',')


def montant_en_lettres(montant):
    """Montant en toutes lettres en dirhams (mention usuelle au Maroc)."""
    try:
        from num2words import num2words
    except ImportError:
        return None
    montant = Decimal(montant).quantize(Decimal('0.01'))
    dirhams = int(montant)
    centimes = int((montant - dirhams) * 100)
    texte = f"{num2words(dirhams, lang='fr')} dirham{'s' if dirhams > 1 else ''}"
    if centimes:
        texte += f" et {num2words(centimes, lang='fr')} centime{'s' if centimes > 1 else ''}"
    return texte[0].upper() + texte[1:]


def _logo_path(company):
    if company.logo:
        try:
            if os.path.exists(company.logo.path):
                return company.logo.path
        except Exception:
            pass
    return DEFAULT_LOGO if os.path.exists(DEFAULT_LOGO) else None


# ─── Canvas numéroté : pied de page légal + « x / y » sur chaque page ─────────

def _make_canvas(company):
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.pdfgen import canvas as pdfcanvas

    class FooterCanvas(pdfcanvas.Canvas):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, **kwargs)
            self._saved_page_states = []

        def showPage(self):
            self._saved_page_states.append(dict(self.__dict__))
            self._startPage()

        def save(self):
            total = len(self._saved_page_states)
            for state in self._saved_page_states:
                self.__dict__.update(state)
                self._draw_footer(total)
                super().showPage()
            super().save()

        def _draw_footer(self, total_pages):
            self.saveState()
            largeur = A4[0]

            adresse = ' '.join(filter(None, [
                company.adresse.replace('\n', ' ') if company.adresse else '',
                company.ville,
            ])).strip()
            nom = company.raison_sociale or ''
            if company.forme_juridique:
                nom += f' {company.forme_juridique}'
            ligne1 = ' - '.join(filter(None, [nom, adresse]))
            ligne2 = ' - '.join(filter(None, [
                f'RC : {company.rc}' if company.rc else '',
                f'IF : {company.if_fiscal}' if company.if_fiscal else '',
                f'TP : {company.tp}' if company.tp else '',
                f'ICE : {company.ice}' if company.ice else '',
                f'CNSS : {company.cnss}' if company.cnss else '',
            ]))
            ligne3 = ' - '.join(filter(None, [
                f'Téléphone : {company.telephone}' if company.telephone else '',
                f'E-mail : {company.email}' if company.email else '',
                f'Site web : {company.site_web}' if company.site_web else '',
            ]))
            lignes = [l for l in (ligne1, ligne2, ligne3, company.pied_de_page) if l]

            # Pagination « x / y » au-dessus du trait, à droite
            self.setFont('Helvetica', 8)
            self.setFillColor(colors.HexColor('#475569'))
            self.drawRightString(largeur - 15 * mm, 19 * mm,
                                 f'{self._pageNumber} / {total_pages}')

            # Trait de séparation
            self.setStrokeColor(colors.HexColor('#cbd5e1'))
            self.setLineWidth(0.5)
            self.line(15 * mm, 18 * mm, largeur - 15 * mm, 18 * mm)

            # Lignes légales centrées
            self.setFont('Helvetica', 6.8)
            self.setFillColor(colors.HexColor('#475569'))
            y = 14.5 * mm
            for texte in lignes:
                self.drawCentredString(largeur / 2, y, texte[:190])
                y -= 3.2 * mm
            self.restoreState()

    return FooterCanvas


# ─── Construction des éléments communs (en-tête) ──────────────────────────────

def _entete_elements(company, titre, lignes_infos, encart_droite_lignes, styles_pack):
    """En-tête : [logo | titre+infos] puis [bloc société | encadré destinataire]."""
    from reportlab.lib import colors
    from reportlab.lib.units import mm
    from reportlab.platypus import Image, Paragraph, Spacer, Table, TableStyle

    (style_normal, style_petit, style_titre, BLEU, GRIS_CLAIR, GRIS_LIGNE) = styles_pack
    elements = []

    # ── Rangée 1 : logo à gauche — titre + n° + date à droite ────────────────
    logo = None
    chemin_logo = _logo_path(company)
    if chemin_logo:
        try:
            logo = Image(chemin_logo, width=52 * mm, height=14 * mm, kind='proportional')
            logo.hAlign = 'LEFT'
        except Exception:
            logo = None

    bloc_titre = [Paragraph(titre, style_titre)]
    for libelle, valeur in lignes_infos:
        bloc_titre.append(Paragraph(
            f'<b>{libelle} :</b> {valeur}', style_normal))

    rangee1 = Table([[logo or '', bloc_titre]], colWidths=[95 * mm, 85 * mm])
    rangee1.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN',  (1, 0), (1, 0), 'RIGHT'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    elements.append(rangee1)
    elements.append(Spacer(1, 4 * mm))

    # ── Rangée 2 : société à gauche — encadré destinataire à droite ──────────
    societe_lignes = []
    nom = company.raison_sociale or 'Société'
    if company.forme_juridique:
        nom += f' {company.forme_juridique}'
    societe_lignes.append(f'<b>{nom}</b>')
    if company.adresse:
        societe_lignes.append(company.adresse.replace('\n', '<br/>'))
    if company.ville:
        societe_lignes.append(company.ville)
    if company.capital_social:
        societe_lignes.append(f'Capital social : {_fmt(company.capital_social)} MAD')
    contacts = ' — '.join(filter(None, [company.telephone, company.email]))
    if contacts:
        societe_lignes.append(contacts)
    bloc_societe = Paragraph('<br/>'.join(societe_lignes), style_normal)

    bloc_droite = Paragraph('<br/>'.join(encart_droite_lignes), style_normal)

    rangee2 = Table([[bloc_societe, bloc_droite]], colWidths=[95 * mm, 85 * mm])
    rangee2.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BACKGROUND', (1, 0), (1, 0), GRIS_CLAIR),
        ('BOX', (1, 0), (1, 0), 0.6, GRIS_LIGNE),
        ('LEFTPADDING', (1, 0), (1, 0), 8),
        ('RIGHTPADDING', (1, 0), (1, 0), 8),
        ('TOPPADDING', (1, 0), (1, 0), 6),
        ('BOTTOMPADDING', (1, 0), (1, 0), 6),
        ('LEFTPADDING', (0, 0), (0, 0), 0),
    ]))
    elements.append(rangee2)
    elements.append(Spacer(1, 6 * mm))
    return elements


def _styles_pack():
    from reportlab.lib import colors
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet

    styles = getSampleStyleSheet()
    BLEU       = colors.HexColor('#1f3b8c')   # bleu HACINT
    GRIS_CLAIR = colors.HexColor('#f1f5f9')
    GRIS_LIGNE = colors.HexColor('#cbd5e1')
    style_normal = ParagraphStyle('normal9', parent=styles['Normal'],
                                  fontSize=9, leading=12)
    style_petit  = ParagraphStyle('petit', parent=styles['Normal'], fontSize=7.5,
                                  leading=9.5, textColor=colors.HexColor('#475569'))
    style_titre  = ParagraphStyle('titre', parent=styles['Normal'], fontSize=17,
                                  leading=21, textColor=BLEU,
                                  fontName='Helvetica-Bold', alignment=2)  # droite
    return (style_normal, style_petit, style_titre, BLEU, GRIS_CLAIR, GRIS_LIGNE)


def _encart_tiers(document):
    """Contenu de l'encadré destinataire (client ou fournisseur)."""
    tiers = document.tiers
    lignes = [f'<b>{tiers.raison_sociale}</b>']
    if tiers.adresse:
        lignes.append(tiers.adresse.replace('\n', '<br/>'))
    ville = ' '.join(filter(None, [tiers.ville, tiers.pays]))
    if ville:
        lignes.append(ville)
    identifiants = ' — '.join(filter(None, [
        f'ICE : {tiers.ice}' if tiers.ice else '',
        f'IF : {tiers.if_fiscal}' if tiers.if_fiscal else '',
        f'RC : {tiers.rc}' if tiers.rc else '',
    ]))
    if identifiants:
        lignes.append(identifiants)
    if tiers.delai_paiement_jours:
        lignes.append(f'Conditions de paiement : {tiers.delai_paiement_jours} jours')
    else:
        lignes.append('Conditions de paiement : comptant')
    if document.reference_externe:
        label = 'Réf. fournisseur' if document.doc_type in ('facture_achat', 'avoir_achat') \
            else 'Réf. commande'
        lignes.append(f'{label} : {document.reference_externe}')
    if document.objet:
        lignes.append(f'Objet : {document.objet}')
    return lignes


# ─── PDF d'un document (devis / facture / avoir / achat) ─────────────────────

def generate_document_pdf(document, company):
    # Import paresseux : une dépendance PDF absente ne doit jamais empêcher
    # le démarrage du backend (le module est importé par les URLs).
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

    pack = _styles_pack()
    (style_normal, style_petit, style_titre, BLEU, GRIS_CLAIR, GRIS_LIGNE) = pack

    buffer = BytesIO()
    doc_pdf = SimpleDocTemplate(
        buffer, pagesize=A4,
        leftMargin=15 * mm, rightMargin=15 * mm,
        topMargin=12 * mm, bottomMargin=26 * mm,
        title=f"{TITRES.get(document.doc_type, 'Document')} {document.numero or ''}",
    )

    numero = document.numero or 'BROUILLON — sans valeur fiscale'
    infos = [('Numéro', numero),
             ('Date', document.date_emission.strftime('%d/%m/%Y'))]
    if document.date_echeance:
        infos.append(('Échéance', document.date_echeance.strftime('%d/%m/%Y')))
    if document.document_origine and document.document_origine.numero:
        infos.append(('Origine', document.document_origine.numero))

    elements = _entete_elements(
        company,
        TITRES.get(document.doc_type, 'Document'),
        infos,
        _encart_tiers(document),
        pack,
    )

    # ── Tableau des lignes (modèle PO : # | Article | Qté | Unité | PU | Remise | Total) ──
    data = [['#', 'Article & Désignation', 'Qté', 'Unité', 'P.U HT', 'Remise %', 'Total HT']]
    for index, ligne in enumerate(document.lignes.all(), start=1):
        if ligne.article:
            cellule = Paragraph(
                f'<b>{ligne.article.code_article}</b><br/>{ligne.designation}',
                style_normal)
            unite = ligne.article.unite_mesure or 'Unité(s)'
        else:
            cellule = Paragraph(ligne.designation, style_normal)
            unite = 'Unité(s)'
        data.append([
            f'{index}.',
            cellule,
            _fmt(ligne.quantite),
            unite,
            _fmt(ligne.prix_unitaire_ht),
            f'{float(ligne.remise_pct):g}' if ligne.remise_pct else '—',
            _fmt(ligne.montant_ht),
        ])
    table_lignes = Table(
        data,
        colWidths=[8 * mm, 72 * mm, 14 * mm, 18 * mm, 22 * mm, 16 * mm, 30 * mm],
        repeatRows=1,
    )
    table_lignes.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), BLEU),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8.5),
        ('ALIGN', (2, 0), (-1, -1), 'RIGHT'),
        ('ALIGN', (3, 1), (3, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.4, GRIS_LIGNE),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, GRIS_CLAIR]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(table_lignes)
    elements.append(Spacer(1, 5 * mm))

    # ── Totaux ────────────────────────────────────────────────────────────────
    totaux = [['Total HT', _fmt(document.total_ht)]]
    for taux, montants in sorted(document.tva_par_taux().items(), reverse=True):
        totaux.append([f'TVA {taux:g} %', _fmt(montants['tva'])])
    totaux.append(['Total TTC', _fmt(document.total_ttc)])
    if document.ras_montant:
        totaux.append([f'Retenue à la source ({document.ras_taux:g} %)',
                       f'- {_fmt(document.ras_montant)}'])
        totaux.append(['Net à payer', _fmt(document.net_a_payer)])
    table_totaux = Table(totaux, colWidths=[55 * mm, 35 * mm], hAlign='RIGHT')
    table_totaux.setStyle(TableStyle([
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('GRID', (0, 0), (-1, -1), 0.4, GRIS_LIGNE),
        ('BACKGROUND', (0, -1), (-1, -1), BLEU),
        ('TEXTCOLOR', (0, -1), (-1, -1), colors.white),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(table_totaux)
    elements.append(Spacer(1, 5 * mm))

    # ── Montant en lettres (mention usuelle marocaine) ────────────────────────
    en_lettres = montant_en_lettres(document.net_a_payer)
    if en_lettres:
        action = 'le présent devis' if document.doc_type == 'devis' else \
            'le présent avoir' if document.doc_type in ('avoir', 'avoir_achat') else \
            'la présente facture'
        elements.append(Paragraph(
            f'Arrêté(e) {action} à la somme de : <b>{en_lettres}</b>.', style_normal))
        elements.append(Spacer(1, 3 * mm))

    # ── Coordonnées bancaires + mentions d'exonération + notes ───────────────
    banque = ' — '.join(filter(None, [
        f'Banque : {company.banque}' if company.banque else '',
        f'RIB : {company.rib}' if company.rib else '',
    ]))
    if banque and document.doc_type in ('facture', 'devis'):
        elements.append(Paragraph(banque, style_petit))
    mentions = {
        ligne.tax_code.mention_legale
        for ligne in document.lignes.all() if ligne.tax_code.mention_legale
    }
    for mention in sorted(mentions):
        elements.append(Paragraph(mention, style_petit))
    if document.notes:
        elements.append(Spacer(1, 3 * mm))
        elements.append(Paragraph(document.notes.replace('\n', '<br/>'), style_petit))

    doc_pdf.build(elements, canvasmaker=_make_canvas(company))
    return buffer.getvalue()


# ─── PDF d'un reçu de paiement ────────────────────────────────────────────────

def generate_paiement_pdf(paiement, company):
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

    pack = _styles_pack()
    (style_normal, style_petit, style_titre, BLEU, GRIS_CLAIR, GRIS_LIGNE) = pack
    document = paiement.document

    buffer = BytesIO()
    doc_pdf = SimpleDocTemplate(
        buffer, pagesize=A4,
        leftMargin=15 * mm, rightMargin=15 * mm,
        topMargin=12 * mm, bottomMargin=26 * mm,
        title=f'Reçu de paiement RECU-{paiement.pk:05d}',
    )

    est_achat = document.doc_type in ('facture_achat', 'avoir_achat')
    titre = 'Reçu de règlement' if est_achat else 'Reçu de paiement'
    infos = [('Numéro', f'RECU-{paiement.pk:05d}'),
             ('Date', paiement.date_paiement.strftime('%d/%m/%Y'))]

    elements = _entete_elements(
        company, titre, infos, _encart_tiers(document), pack)

    detail = [
        ['Document réglé', document.numero or '—'],
        ['Tiers', document.tiers.raison_sociale],
        ['Date du paiement', paiement.date_paiement.strftime('%d/%m/%Y')],
        ['Mode de paiement', paiement.get_mode_display()],
    ]
    if paiement.reference:
        detail.append(['Référence', paiement.reference])
    if paiement.banque:
        detail.append(['Banque', paiement.banque])
    detail.append(['Montant', f'{_fmt(paiement.montant)} MAD'])
    if paiement.timbre_montant:
        detail.append(['Droit de timbre (0,25 % espèces)',
                       f'{_fmt(paiement.timbre_montant)} MAD'])
    detail.append(['Total facturé (net à payer)', f'{_fmt(document.net_a_payer)} MAD'])
    detail.append(['Cumul réglé', f'{_fmt(document.montant_paye)} MAD'])
    detail.append(['Reste à payer', f'{_fmt(document.reste_a_payer)} MAD'])

    table = Table(detail, colWidths=[70 * mm, 70 * mm], hAlign='LEFT')
    table.setStyle(TableStyle([
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 0.4, GRIS_LIGNE),
        ('BACKGROUND', (0, 0), (0, -1), GRIS_CLAIR),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    elements.append(table)
    elements.append(Spacer(1, 5 * mm))

    en_lettres = montant_en_lettres(paiement.montant)
    if en_lettres:
        verbe = 'réglé' if est_achat else 'reçu'
        elements.append(Paragraph(
            f'Montant {verbe} : <b>{en_lettres}</b>.', style_normal))

    doc_pdf.build(elements, canvasmaker=_make_canvas(company))
    return buffer.getvalue()
