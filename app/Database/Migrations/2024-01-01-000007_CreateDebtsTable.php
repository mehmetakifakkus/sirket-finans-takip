<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateDebtsTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id' => [
                'type'           => 'INT',
                'constraint'     => 11,
                'unsigned'       => true,
                'auto_increment' => true,
            ],
            'kind' => [
                'type'       => 'ENUM',
                'constraint' => ['debt', 'receivable'],
            ],
            'party_id' => [
                'type'       => 'INT',
                'constraint' => 11,
                'unsigned'   => true,
            ],
            'principal_amount' => [
                'type'       => 'DECIMAL',
                'constraint' => '15,2',
            ],
            'currency' => [
                'type'       => 'VARCHAR',
                'constraint' => 3,
                'default'    => 'TRY',
            ],
            'vat_rate' => [
                'type'       => 'DECIMAL',
                'constraint' => '5,2',
                'default'    => 0.00,
            ],
            'start_date' => [
                'type' => 'DATE',
                'null' => true,
            ],
            'due_date' => [
                'type' => 'DATE',
                'null' => true,
            ],
            'status' => [
                'type'       => 'ENUM',
                'constraint' => ['open', 'closed'],
                'default'    => 'open',
            ],
            'notes' => [
                'type' => 'TEXT',
                'null' => true,
            ],
            'created_at' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
            'updated_at' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
        ]);

        $this->forge->addKey('id', true);
        $this->forge->addKey('status');
        $this->forge->addKey('kind');
        $this->forge->addKey('party_id');
        $this->forge->addKey('due_date');
        $this->forge->addForeignKey('party_id', 'parties', 'id', 'CASCADE', 'CASCADE');
        $this->forge->createTable('debts');
    }

    public function down()
    {
        $this->forge->dropTable('debts');
    }
}
