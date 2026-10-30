"""destinatario.enviado_en para monitoreo

Revision ID: 0002
Revises: 0001
Create Date: 2026-10-30
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = '0002'
down_revision: Union[str, None] = '0001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('destinatario', sa.Column('enviado_en', sa.DateTime(timezone=True), nullable=True))
    op.create_index('idx_destinatario_enviado_en', 'destinatario', ['enviado_en'], unique=False)
    # Envíos anteriores a esta columna: se toma la fecha en que arrancó su campaña
    op.execute("""
        UPDATE destinatario d SET enviado_en = c.fecha_inicio_envio
        FROM campana c
        WHERE d.campana_id = c.id AND d.enviado_en IS NULL
          AND d.estado_envio IN ('ENVIADO', 'ENTREGADO', 'LEIDO', 'FALLIDO')
    """)


def downgrade() -> None:
    op.drop_index('idx_destinatario_enviado_en', table_name='destinatario')
    op.drop_column('destinatario', 'enviado_en')
