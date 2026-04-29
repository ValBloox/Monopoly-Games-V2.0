import React from "react";

export default function HowToPlay({ onClose }) {
  return (
    <div className="modal-overlay" data-testid="howto-modal" onClick={onClose}>
      <div className="modal-box howto-box" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" data-testid="howto-close" onClick={onClose}>×</button>
        <h2>Cara Bermain</h2>
        <h3>Aturan Dasar</h3>
        <ul>
          <li>Setiap pemain mulai dengan ORI 1500.</li>
          <li>Lempar dadu untuk maju di papan. Lewati AWAL → ambil IDR 200.</li>
          <li>Beli properti yang kamu darati. Bayar sewa di properti pemain lain.</li>
          <li>Kumpulkan satu grup warna penuh untuk bisa membangun.</li>
          <li>Pos perjuangan (1-4) → Markas → Benteng Republik (max).</li>
        </ul>
        <h3>Mode Kemerdekaan</h3>
        <ul>
          <li>Menang dengan tiga syarat: kuasai satu grup penuh, bangun minimal satu Benteng Republik, dan jawab benar minimal 2 dari 3 soal Tantangan Sejarah.</li>
          <li>Setelah deklarasi diumumkan, pemain lain mendapat satu giliran terakhir.</li>
        </ul>
        <h3>Kartu & Petak</h3>
        <ul>
          <li>PROKLAMASI: kejadian dramatis perjuangan.</li>
          <li>BHINNEKA: peristiwa gotong royong rakyat.</li>
          <li>PENJARA DIGUL: bayar tebusan, lempar double, atau gunakan kartu bebas.</li>
        </ul>
      </div>
    </div>
  );
}
