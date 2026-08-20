import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/* ═══════════════════════════════════════════════
   GÉNÉRATEUR PDF PROFESSIONNEL
   Factures, Devis, Bons, Reçus
═══════════════════════════════════════════════ */

// Couleurs NANA SERVICE
const COULEURS = {
    primary:   [15, 45, 107],   // Bleu marine
    secondary: [255, 107, 0],   // Orange
    success:   [16, 185, 129],
    danger:    [239, 68, 68],
    gray:      [107, 114, 128],
    lightGray: [243, 244, 246],
    white:     [255, 255, 255],
    black:     [17, 24, 39],
};

/**
 * Créer l'en-tête du document
 */
const creerEntete = (doc, entreprise, typeDoc) => {
    const W = doc.internal.pageSize.getWidth();

    // Fond en-tête
    doc.setFillColor(...COULEURS.primary);
    doc.rect(0, 0, W, 45, 'F');

    // Bande orange
    doc.setFillColor(...COULEURS.secondary);
    doc.rect(0, 45, W, 4, 'F');

    // Logo / Nom entreprise
    doc.setTextColor(...COULEURS.white);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text(entreprise?.nom || 'NANA SERVICE', 15, 20);

    // Slogan
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(200, 210, 230);
    doc.text(entreprise?.slogan || 'Votre partenaire de confiance', 15, 28);

    // Contacts
    const contacts = [
        entreprise?.telephone && `📞 ${entreprise.telephone}`,
        entreprise?.email     && `✉ ${entreprise.email}`,
        entreprise?.adresse   && `📍 ${entreprise.adresse}`,
    ].filter(Boolean).join('   ');

    doc.setFontSize(8);
    doc.setTextColor(180, 195, 220);
    doc.text(contacts, 15, 38);

    // Type de document (droite)
    doc.setTextColor(...COULEURS.white);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(typeDoc.toUpperCase(), W - 15, 20, { align: 'right' });

    return 55; // Y après en-tête
};

/**
 * Créer la section informations (numéro, dates, client)
 */
const creerInfos = (doc, y, donnees) => {
    const W = doc.internal.pageSize.getWidth();
    const midX = W / 2;

    // Cadre gauche — Infos document
    doc.setFillColor(...COULEURS.lightGray);
    doc.roundedRect(10, y, midX - 15, 45, 3, 3, 'F');

    doc.setTextColor(...COULEURS.primary);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('DÉTAILS DU DOCUMENT', 15, y + 8);

    doc.setTextColor(...COULEURS.black);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    const infosDoc = [
        ['Numéro :', donnees.numero || '—'],
        ['Date émission :', donnees.dateEmission || new Date().toLocaleDateString('fr-FR')],
        ['Date échéance :', donnees.dateEcheance || '—'],
        ['Boutique :', donnees.boutiqueLabel || '—'],
    ];

    infosDoc.forEach(([label, val], i) => {
        doc.setFont('helvetica', 'bold');
        doc.text(label, 15, y + 16 + i * 7);
        doc.setFont('helvetica', 'normal');
        doc.text(String(val), 50, y + 16 + i * 7);
    });

    // Cadre droit — Infos client
    doc.setFillColor(230, 240, 255);
    doc.roundedRect(midX, y, midX - 10, 45, 3, 3, 'F');

    doc.setTextColor(...COULEURS.primary);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('CLIENT', midX + 5, y + 8);

    doc.setTextColor(...COULEURS.black);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(donnees.clientNom || '—', midX + 5, y + 18);

    doc.setFontSize(9);
    const infosClient = [
        donnees.clientTel   && `📞 ${donnees.clientTel}`,
        donnees.clientEmail && `✉ ${donnees.clientEmail}`,
        donnees.clientAdresse && `📍 ${donnees.clientAdresse}`,
    ].filter(Boolean);

    infosClient.forEach((info, i) => {
        doc.text(info, midX + 5, y + 26 + i * 7);
    });

    return y + 52;
};

/**
 * Créer le tableau des lignes
 */
const creerTableau = (doc, y, lignes, devise) => {
    const colonnes = [
        { header: 'N°',          dataKey: 'num'   },
        { header: 'Description', dataKey: 'desc'  },
        { header: 'Qté',         dataKey: 'qte'   },
        { header: 'Unité',       dataKey: 'unite' },
        { header: 'Prix Unit.',  dataKey: 'pu'    },
        { header: 'Remise',      dataKey: 'rem'   },
        { header: 'Sous-total',  dataKey: 'total' },
    ];

    const rows = (lignes || []).map((l, i) => ({
        num:   i + 1,
        desc:  l.nom || l.description || '—',
        qte:   l.quantite || 1,
        unite: l.unite || 'u',
        pu:    `${(l.prixUnitaire || 0).toLocaleString('fr-FR')} ${devise}`,
        rem:   l.remise ? `${l.remise}%` : '—',
        total: `${(l.sousTotal || 0).toLocaleString('fr-FR')} ${devise}`,
    }));

    autoTable(doc, {
        startY:    y,
        head:      [colonnes.map(c => c.header)],
        body:      rows.map(r => colonnes.map(c => r[c.dataKey])),
        styles: {
            fontSize:  9,
            cellPadding: 5,
            textColor: COULEURS.black,
        },
        headStyles: {
            fillColor: COULEURS.primary,
            textColor: COULEURS.white,
            fontStyle: 'bold',
            fontSize:  9,
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252],
        },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            2: { cellWidth: 15, halign: 'center' },
            3: { cellWidth: 18, halign: 'center' },
            4: { cellWidth: 32, halign: 'right'  },
            5: { cellWidth: 22, halign: 'center' },
            6: { cellWidth: 35, halign: 'right', fontStyle: 'bold' },
        },
        margin: { left: 10, right: 10 },
    });

    return doc.lastAutoTable.finalY + 5;
};

/**
 * Créer le bloc totaux
 */
const creerTotaux = (doc, y, donnees, devise) => {
    const W = doc.internal.pageSize.getWidth();
    const startX = W - 90;

    const lignesTotaux = [
        { label: 'Sous-total',     val: donnees.sousTotal || 0, normal: true },
        donnees.remiseGlobale > 0 && {
            label: `Remise (${donnees.remiseGlobale || 0}%)`,
            val: -(donnees.montantRemise || 0),
            normal: true,
        },
        donnees.fraisLivraison > 0 && {
            label: 'Frais de livraison',
            val: donnees.fraisLivraison || 0,
            normal: true,
        },
        donnees.montantTVA > 0 && {
            label: `TVA (${donnees.tauxTVA || 0}%)`,
            val: donnees.montantTVA || 0,
            normal: true,
        },
    ].filter(Boolean);

    let currentY = y;

    // Sous-totaux
    lignesTotaux.forEach(ligne => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...COULEURS.gray);
        doc.text(ligne.label + ' :', startX, currentY);
        doc.setTextColor(...COULEURS.black);
        doc.text(
            `${ligne.val.toLocaleString('fr-FR')} ${devise}`,
            W - 10, currentY, { align: 'right' }
        );
        currentY += 7;
    });

    // Séparateur
    doc.setDrawColor(...COULEURS.primary);
    doc.setLineWidth(0.5);
    doc.line(startX, currentY, W - 10, currentY);
    currentY += 5;

    // Total TTC
    doc.setFillColor(...COULEURS.primary);
    doc.roundedRect(startX - 5, currentY - 5, W - startX + 5, 14, 2, 2, 'F');

    doc.setTextColor(...COULEURS.white);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('TOTAL', startX, currentY + 5);
    doc.text(
        `${(donnees.montantTotal || 0).toLocaleString('fr-FR')} ${devise}`,
        W - 10, currentY + 5, { align: 'right' }
    );
    currentY += 16;

    // Reste à payer
    if ((donnees.resteAPayer || 0) > 0) {
        doc.setFillColor(255, 237, 213);
        doc.roundedRect(startX - 5, currentY - 5, W - startX + 5, 14, 2, 2, 'F');
        doc.setTextColor(...COULEURS.secondary);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('RESTE À PAYER', startX, currentY + 5);
        doc.text(
            `${(donnees.resteAPayer || 0).toLocaleString('fr-FR')} ${devise}`,
            W - 10, currentY + 5, { align: 'right' }
        );
        currentY += 16;
    } else {
        doc.setFillColor(209, 250, 229);
        doc.roundedRect(startX - 5, currentY - 5, W - startX + 5, 14, 2, 2, 'F');
        doc.setTextColor(...COULEURS.success);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('✓ PAYÉE', startX, currentY + 5);
        currentY += 16;
    }

    return currentY;
};

/**
 * Créer le pied de page
 */
const creerPiedPage = (doc, entreprise, notes = '') => {
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();

    // Bande orange bas
    doc.setFillColor(...COULEURS.secondary);
    doc.rect(0, H - 20, W, 2, 'F');

    // Pied de page
    doc.setFillColor(...COULEURS.primary);
    doc.rect(0, H - 18, W, 18, 'F');

    doc.setTextColor(...COULEURS.white);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(
        entreprise?.nom || 'NANA SERVICE',
        W / 2, H - 10, { align: 'center' }
    );
    doc.setTextColor(200, 210, 230);
    doc.setFontSize(7);
    doc.text(
        [entreprise?.telephone, entreprise?.email, entreprise?.adresse].filter(Boolean).join(' | '),
        W / 2, H - 4, { align: 'center' }
    );

    // Notes
    if (notes) {
        doc.setTextColor(...COULEURS.gray);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.text(`Note : ${notes}`, 10, H - 25);
    }
};

/**
 * Générer une facture PDF complète
 */
export const genererFacturePDF = (facture, entreprise) => {
    const doc    = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const devise = entreprise?.devise || 'GNF';

    const typeLabels = {
        facture:       'FACTURE',
        avoir:         'AVOIR',
        recu:          'REÇU',
        bon_commande:  'BON DE COMMANDE',
        bon_livraison: 'BON DE LIVRAISON',
        devis:         'DEVIS',
    };

    let y = creerEntete(doc, entreprise, typeLabels[facture.type] || 'FACTURE');
    y = creerInfos(doc, y, {
        numero:        facture.numero,
        dateEmission:  facture.dateEmission,
        dateEcheance:  facture.dateEcheance,
        boutiqueLabel: facture.boutiqueLabel,
        clientNom:     facture.clientNom,
        clientTel:     facture.clientTel,
        clientEmail:   facture.clientEmail,
        clientAdresse: facture.clientAdresse,
    });

    y += 5;

    y = creerTableau(doc, y, facture.lignes, devise);
    y += 5;

    creerTotaux(doc, y, {
        sousTotal:      facture.sousTotal,
        remiseGlobale:  facture.remiseGlobale,
        montantRemise:  facture.montantRemise,
        fraisLivraison: facture.fraisLivraison,
        tauxTVA:        facture.tauxTVA,
        montantTVA:     facture.montantTVA,
        montantTotal:   facture.montantTotal,
        resteAPayer:    facture.resteAPayer,
    }, devise);

    // Conditions de paiement
    if (facture.conditionsPaiement) {
        const H = doc.internal.pageSize.getHeight();
        doc.setFontSize(8);
        doc.setTextColor(...COULEURS.gray);
        doc.text(`Conditions : ${facture.conditionsPaiement}`, 10, H - 28);
    }

    creerPiedPage(doc, entreprise, facture.notes);

    // Numérotation pages
    const nbPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= nbPages; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(...COULEURS.gray);
        doc.text(
            `Page ${i} / ${nbPages}`,
            doc.internal.pageSize.getWidth() - 10,
            doc.internal.pageSize.getHeight() - 22,
            { align: 'right' }
        );
    }

    return doc;
};

/**
 * Générer et télécharger la facture
 */
export const telechargerFacture = (facture, entreprise) => {
    const doc = genererFacturePDF(facture, entreprise);
    doc.save(`${facture.numero}.pdf`);
};

/**
 * Générer et prévisualiser la facture (nouvelle fenêtre)
 */
export const previsualiserFacture = (facture, entreprise) => {
    const doc = genererFacturePDF(facture, entreprise);
    const url = doc.output('bloburl');
    window.open(url, '_blank');
};

/**
 * Générer un PDF simple de ticket/reçu (format 80mm)
 */
export const genererTicket = (commande, entreprise) => {
    const doc    = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [80, 200] });
    const devise = entreprise?.devise || 'GNF';
    const W      = 80;

    // En-tête
    doc.setFillColor(...COULEURS.primary);
    doc.rect(0, 0, W, 25, 'F');

    doc.setTextColor(...COULEURS.white);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(entreprise?.nom || 'NANA SERVICE', W / 2, 10, { align: 'center' });

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(entreprise?.telephone || '', W / 2, 16, { align: 'center' });
    doc.text(new Date().toLocaleString('fr-FR'), W / 2, 21, { align: 'center' });

    let y = 32;

    // Numéro
    doc.setFontSize(9);
    doc.setTextColor(...COULEURS.black);
    doc.setFont('helvetica', 'bold');
    doc.text(`Commande: ${commande.numero}`, W / 2, y, { align: 'center' });
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Client: ${commande.clientNom}`, 3, y);
    y += 5;

    // Ligne séparatrice
    doc.setDrawColor(...COULEURS.gray);
    doc.setLineWidth(0.3);
    doc.line(3, y, W - 3, y);
    y += 4;

    // Lignes produits
    doc.setFontSize(8);
    (commande.lignes || []).forEach(l => {
        doc.setFont('helvetica', 'normal');
        const desc = l.nom?.length > 25 ? l.nom.substring(0, 22) + '...' : l.nom;
        doc.text(`${l.quantite}x ${desc}`, 3, y);
        doc.setFont('helvetica', 'bold');
        doc.text(
            `${(l.sousTotal || 0).toLocaleString('fr-FR')}`,
            W - 3, y, { align: 'right' }
        );
        y += 5;
    });

    // Total
    doc.line(3, y, W - 3, y);
    y += 5;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL :', 3, y);
    doc.text(
        `${(commande.montantTotal || 0).toLocaleString('fr-FR')} ${devise}`,
        W - 3, y, { align: 'right' }
    );
    y += 8;

    // Pied
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COULEURS.gray);
    doc.text('Merci pour votre confiance !', W / 2, y, { align: 'center' });
    y += 4;
    doc.text(entreprise?.slogan || '', W / 2, y, { align: 'center' });

    return doc;
};

export const telechargerTicket = (commande, entreprise) => {
    const doc = genererTicket(commande, entreprise);
    doc.save(`ticket_${commande.numero}.pdf`);
};

export const imprimerTicket = (commande, entreprise) => {
    const doc = genererTicket(commande, entreprise);
    const url = doc.output('bloburl');
    const win = window.open(url, '_blank');
    if (win) { win.onload = () => win.print(); }
};

/**
 * Export liste en PDF (tableau)
 */
export const exporterListePDF = (titre, colonnes, donnees, entreprise) => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    creerEntete(doc, entreprise, titre);

    const y = 58;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COULEURS.primary);
    doc.text(`${titre} — ${new Date().toLocaleDateString('fr-FR')}`, 10, y);

    autoTable(doc, {
        startY: y + 6,
        head:   [colonnes.map(c => c.header)],
        body:   donnees.map(row => colonnes.map(c => {
            const val = row[c.key];
            return c.format ? c.format(val, row) : (val ?? '—');
        })),
        styles: { fontSize: 8, cellPadding: 4 },
        headStyles: { fillColor: COULEURS.primary, textColor: COULEURS.white, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 10, right: 10 },
    });

    creerPiedPage(doc, entreprise);
    doc.save(`${titre.replace(/\s/g, '_')}_${Date.now()}.pdf`);
};

export default {
    genererFacturePDF, telechargerFacture, previsualiserFacture,
    genererTicket, telechargerTicket, imprimerTicket,
    exporterListePDF,
};